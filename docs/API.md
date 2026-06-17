# API Documentation

## OpenAPI Specification

You can download the full OpenAPI 3.0 spec [here](./openapi.json).

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently uses local storage. JWT authentication planned for future versions.

## Rate Limiting
API endpoints are rate-limited:
- **Default**: 100 requests per minute
- **API endpoints**: 60 requests per minute
- **Auth endpoints**: 10 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the window resets

## Error Handling
All errors follow this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Endpoints

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | List tasks with filters |
| POST | `/tasks` | Create new task |
| GET | `/tasks/[id]` | Get task details |
| PATCH | `/tasks/[id]` | Update task |
| DELETE | `/tasks/[id]` | Delete task (soft delete) |
| PATCH | `/tasks/[id]/toggle` | Toggle completion |
| POST | `/tasks/[id]/archive` | Archive a task |
| POST | `/tasks/[id]/restore` | Restore deleted task |

#### Query Parameters (GET /tasks)
- `view`: 'today' \| 'next7' \| 'upcoming' \| 'all'
- `completed`: boolean
- `listId`: string
- `labelId`: string
- `priority`: 'high' \| 'medium' \| 'low' \| 'none'
- `search`: string
- `limit`: number (default: 100)
- `offset`: number
- `sortBy`: 'date' \| 'created' \| 'priority' \| 'name' \| 'list'
- `sortDirection`: 'asc' \| 'desc'

### Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lists` | List all lists |
| POST | `/lists` | Create list |
| GET | `/lists/[id]` | Get list details |
| PATCH | `/lists/[id]` | Update list |
| DELETE | `/lists/[id]` | Delete list |
| PUT | `/lists/reorder` | Reorder lists |

### Labels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/labels` | List all labels |
| POST | `/labels` | Create label |
| GET | `/labels/[id]` | Get label details |
| PATCH | `/labels/[id]` | Update label |
| DELETE | `/labels/[id]` | Delete label |

### Subtasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks/[id]/subtasks` | List subtasks |
| POST | `/tasks/[id]/subtasks` | Create subtask |
| PATCH | `/tasks/[id]/subtasks/[subtaskId]` | Update subtask |
| DELETE | `/tasks/[id]/subtasks/[subtaskId]` | Delete subtask |

### Task Dependencies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/task-dependencies?taskId=...` | List dependencies |
| POST | `/task-dependencies` | Add dependency |
| DELETE | `/task-dependencies/[id]` | Remove dependency |

### Task Links
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/task-links?taskId=...` | List links |
| POST | `/task-links` | Create link |
| DELETE | `/task-links?id=...` | Remove link |

**Link Types:** `blocks`, `related`, `depends_on`, `duplicate`

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/templates` | List all templates |
| POST | `/templates` | Create template |
| GET | `/templates/[id]` | Get template |
| PATCH | `/templates/[id]` | Update template |
| DELETE | `/templates/[id]` | Delete template |
| POST | `/templates/[id]/use` | Create task from template |

### Habits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/habits` | List all habits |
| POST | `/habits` | Create habit |
| GET | `/habits/[id]` | Get habit |
| PATCH | `/habits/[id]` | Update habit |
| DELETE | `/habits/[id]` | Delete habit |
| POST | `/habits/[id]/completions` | Complete habit |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/goals` | List all goals |
| POST | `/goals` | Create goal |
| GET | `/goals/[id]` | Get goal |
| PATCH | `/goals/[id]` | Update goal |
| DELETE | `/goals/[id]` | Delete goal |
| GET | `/goals/[id]/milestones` | List milestones |
| POST | `/goals/[id]/milestones` | Create milestone |

### Time Blocks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/time-blocks?start=...&end=...` | List time blocks |
| POST | `/time-blocks` | Create time block |
| PATCH | `/time-blocks` | Update time block |
| DELETE | `/time-blocks?id=...` | Delete time block |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reminders?taskId=...` | List reminders |
| POST | `/reminders` | Create reminder |
| PATCH | `/reminders?id=...` | Update reminder |
| DELETE | `/reminders?id=...` | Delete reminder |

**Channels:** `email`, `in-app`, `slack`, `discord`

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/comments?taskId=...` | List comments |
| POST | `/comments` | Create comment |
| GET | `/comments/[id]` | Get comment |
| PATCH | `/comments/[id]` | Update comment |
| DELETE | `/comments/[id]` | Delete comment |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q=...` | Search tasks |
| POST | `/search/suggestions` | Get search suggestions |

### Export/Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/export?format=...` | Export data |
| POST | `/import` | Import data |

**Export Formats:** `json`, `markdown`, `csv`, `ics`

### Workspaces
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workspaces` | List workspaces |
| POST | `/workspaces` | Create workspace |
| GET | `/workspaces/[id]` | Get workspace |
| PATCH | `/workspaces/[id]` | Update workspace |
| DELETE | `/workspaces/[id]` | Delete workspace |

### Workspace Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workspaces/[id]/members` | List members |
| POST | `/workspaces/[id]/members` | Add member |
| DELETE | `/workspaces/[id]/members/[userId]` | Remove member |

**Roles:** `admin`, `editor`, `viewer`

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notifications/email` | Send email notification |
| POST | `/notifications` | Send chat notification |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports?type=...` | Get report data |

**Report Types:** `burndown`, `time-in-state`, `velocity`, `summary`

## Response Format
```json
{
  "data": {},
  "total": 0,
  "meta": {}
}
```

## Error Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```