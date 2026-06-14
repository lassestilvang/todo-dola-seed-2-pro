# Todo Dola Seed 2 Pro

A modern, full-featured task planner built with Next.js 16 and React.

## Features

- **Task Management**: Create, read, update, delete tasks with due dates and priorities
- **Subtasks**: Break tasks into smaller subtasks with completion tracking
- **Lists**: Organize tasks into custom lists with Kanban board view
- **Labels**: Categorize and filter tasks with colored labels
- **Task Dependencies**: Block tasks on other tasks being completed
- **Time Tracking**: Log time spent on tasks with a timer
- **Search**: Fuzzy search across tasks and labels
- **Dark/Light Mode**: System-aware theme switching
- **Export/Import**: Backup and restore your data (JSON & Markdown)
- **Task Detail Pages**: Dedicated views for each task
- **Task History**: Track changes to tasks over time
- **Dashboard**: Statistics and overview of your tasks
- **Task Templates**: Save and reuse common task patterns
- **Task Comments**: Discuss tasks with threaded comments
- **Task Sharing**: Share tasks with unique links
- **Keyboard Shortcuts**: Quick actions with `⌘K`, `⌘N`, `⌘⇧?`
- **Import from Todoist/Trello**: Migrate from other task management tools

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
bun test

# Run linting
pnpm lint

# Run type checking
pnpm typecheck
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

```
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   ├── task/[id]/      # Task detail pages
│   └── ...             # Other pages
├── components/          # React components
│   ├── ui/             # UI primitives
│   ├── tasks/          # Task components
│   ├── lists/          # List components
│   └── labels/         # Label components
├── lib/                # Library code
│   ├── db/             # Database layer
│   ├── schemas/        # Zod schemas
│   └── utils/          # Utility functions
└── tests/              # Test files
```

## API Endpoints

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (query: `view`, `listId`, `labelId`, `priority`, `completed`, `recurring`, `dateFrom`, `dateTo`, `limit`, `offset`) |
| POST | `/api/tasks` | Create new task |
| GET | `/api/tasks/[id]` | Get task by ID |
| PATCH | `/api/tasks/[id]` | Update task |
| DELETE | `/api/tasks/[id]` | Delete task |
| PATCH | `/api/tasks/[id]/toggle` | Toggle task completion |
| POST | `/api/tasks/[id]/restore` | Restore a task (recreates with original data) |
| GET | `/api/tasks/[id]/history` | Get task change history |
| GET | `/api/tasks/[id]/labels` | List labels for a task |
| POST | `/api/tasks/[id]/labels` | Add label to task |
| DELETE | `/api/tasks/[id]/labels?labelId=...` | Remove label from task |
| GET | `/api/tasks/[id]/subtasks` | List subtasks |
| POST | `/api/tasks/[id]/subtasks` | Create subtask |
| PATCH | `/api/tasks/[id]/subtasks/[subtaskId]` | Update subtask |
| DELETE | `/api/tasks/[id]/subtasks/[subtaskId]` | Delete subtask |
| POST | `/api/tasks/bulk` | Bulk operations (action: `complete`, `incomplete`, `delete`, `reorder`) |

### Task Dependencies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/task-dependencies?taskId=...` | List dependencies for a task |
| POST | `/api/task-dependencies` | Add dependency (body: `taskId`, `dependsOnTaskId`) |
| DELETE | `/api/task-dependencies/[id]` | Remove dependency by ID |

### Task Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/task-notes?taskId=...` | List notes for a task |
| POST | `/api/task-notes` | Create a note (body: `taskId`, `title`, `content`) |
| GET | `/api/task-notes/[id]` | Get note by ID |
| PATCH | `/api/task-notes/[id]` | Update note |
| DELETE | `/api/task-notes/[id]` | Delete note |

### Time Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/time-entries?taskId=...` | List time entries for a task |
| POST | `/api/time-entries` | Create time entry (body: `taskId`, `duration`, `description`, `startedAt`) |

### Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lists` | List all lists |
| POST | `/api/lists` | Create list |
| GET | `/api/lists/[id]` | Get list by ID |
| PATCH | `/api/lists/[id]` | Update list |
| DELETE | `/api/lists/[id]` | Delete list |
| PUT | `/api/lists` | Reorder lists (body: `lists: [{id, sortOrder}]`) |

### Labels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/labels` | List all labels |
| POST | `/api/labels` | Create label |
| GET | `/api/labels/[id]` | Get label by ID |
| PATCH | `/api/labels/[id]` | Update label |
| DELETE | `/api/labels/[id]` | Delete label |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comments?taskId=...` | List comments for a task |
| POST | `/api/comments` | Create comment (body: `taskId`, `author`, `content`) |
| GET | `/api/comments/[id]` | Get comment by ID |
| PATCH | `/api/comments/[id]` | Update comment |
| DELETE | `/api/comments/[id]` | Delete comment |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List all templates |
| POST | `/api/templates` | Create template |
| GET | `/api/templates/[id]` | Get template by ID |
| PATCH | `/api/templates/[id]` | Update template |
| DELETE | `/api/templates/[id]` | Delete template |
| POST | `/api/templates/[id]/use` | Create task from template |

### Share
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/share` | Create share token (body: `taskId`, `sharedBy?`) |
| GET | `/api/share/[token]` | Get shared task by token |
| DELETE | `/api/share/[token]` | Delete share token |

### Attachments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attachments` | List attachments for a task |
| POST | `/api/attachments` | Upload attachment (multipart form) |
| GET | `/api/attachments?filename=...` | Download attachment |

### Recurring Exceptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recurring-exceptions?parentTaskId=...` | List exceptions for a recurring task |
| POST | `/api/recurring-exceptions` | Add exception (body: `parentTaskId`, `exceptionDate`) |
| DELETE | `/api/recurring-exceptions/[id]` | Remove exception |

### Export/Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export` | Export data (JSON or Markdown via `?format=markdown`) |
| POST | `/api/import` | Import data (supports JSON, Todoist, Trello formats) |

### Custom Views
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/custom-views` | List custom views |
| POST | `/api/custom-views` | Create custom view |
| GET | `/api/custom-views/[id]` | Get custom view by ID |
| PATCH | `/api/custom-views/[id]` | Update custom view |
| DELETE | `/api/custom-views/[id]` | Delete custom view |
| POST | `/api/custom-views/[id]/set-default` | Set as default view |

## Database

Uses sql.js (SQLite in WebAssembly) for client-side storage with persistence to `db/planner.db`.

## Development Notes

- Uses pnpm as the package manager
- TypeScript with strict mode enabled
- Tailwind CSS v4 with custom design system
- Base UI components for headless UI primitives