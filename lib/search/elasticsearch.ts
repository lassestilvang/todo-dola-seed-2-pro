interface SearchResult {
  id: string;
  score: number;
  data: Record<string, unknown>;
}

interface SearchClient {
  search(index: string, query: string, options?: Record<string, unknown>): Promise<SearchResult[]>;
  index(index: string, id: string, data: Record<string, unknown>): Promise<void>;
  delete(index: string, id: string): Promise<void>;
}

class ElasticsearchClient implements SearchClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
    this.apiKey = process.env.ELASTICSEARCH_API_KEY || '';
  }

  private async request(endpoint: string, method: string, body?: unknown) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Elasticsearch error: ${response.status}`);
    }

    return response.json();
  }

  async search(index: string, query: string, options: Record<string, unknown> = {}): Promise<SearchResult[]> {
    try {
      const result = await this.request(`/${index}/_search`, 'GET', {
        query: {
          multi_match: {
            query,
            fields: ['name^3', 'description', 'labels', 'notes'],
            ...options,
          },
        },
      });

      return (result.hits?.hits || []).map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        data: hit._source,
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  async index(index: string, id: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.request(`/${index}/_doc/${id}`, 'PUT', data);
    } catch (error) {
      console.error('Index error:', error);
    }
  }

  async delete(index: string, id: string): Promise<void> {
    try {
      await this.request(`/${index}/_doc/${id}`, 'DELETE');
    } catch (error) {
      console.error('Delete error:', error);
    }
  }
}

class MockSearchClient implements SearchClient {
  async search(index: string, query: string): Promise<SearchResult[]> {
    // Fallback to database search
    const { searchTasks } = await import('../db/queries');
    const tasks = await searchTasks(query);
    return tasks.map((task: any) => ({
      id: task.id,
      score: 1,
      data: task,
    }));
  }

  async index(): Promise<void> {
    // No-op for mock
  }

  async delete(): Promise<void> {
    // No-op for mock
  }
}

export function getSearchClient(): SearchClient {
  if (process.env.ELASTICSEARCH_URL) {
    return new ElasticsearchClient();
  }
  return new MockSearchClient();
}

export async function searchTasksAdvanced(query: string, options: Record<string, unknown> = {}): Promise<SearchResult[]> {
  const client = getSearchClient();
  return client.search('tasks', query, options);
}

export async function indexTask(id: string, data: Record<string, unknown>): Promise<void> {
  const client = getSearchClient();
  await client.index('tasks', id, data);
}

export async function deleteTaskFromIndex(id: string): Promise<void> {
  const client = getSearchClient();
  await client.delete('tasks', id);
}