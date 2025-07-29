# Project Tracker App

This repository contains a simple project management visualisation app.  It consists of a Node.js backend that serves a REST API and a Vue.js frontend that consumes the API and renders interactive Gantt charts.

## Architecture Overview

### Backend (`index.js`)

The backend is a standalone Node.js server built using the built‑in `http`, `fs` and `path` modules.  The server performs the following tasks:

- **Persisting data:** The file `data.json` stores an object with a top‑level `programmes` array. Each programme has a unique `id`, a `name` and a list of `modules`. Each module has its own `id`, `name` and a list of `tasks`, and each task has an `id`, `name`, `start` and `end` date.  
  The helper functions `ensureData()`, `loadData()` and `saveData()` handle creating the file if it does not exist, loading the JSON on each request, and writing the updated JSON back to disk.

- **Serving static files:** The function `serveStatic(req, res)` maps requests outside the `/api` namespace to files in the `frontend` directory. It determines the correct MIME type based on file extension and returns 404 if the file is not found.

- **API routes:** Requests starting with `/api` are handled in `handleApi(req, res)`.  The server supports:
  - `GET /api/programmes` – returns a list of all programmes.
  - `GET /api/programmes/:id` – returns a single programme including its modules and tasks.
  - `POST /api/programmes/:id/modules` – appends a new module to the given programme.  The server assigns a unique module ID.
  - `POST /api/modules/:id/tasks` – appends a new task to the given module.  A task ID is assigned by the server.
  
  Each route reads the current `data.json`, modifies the in‑memory object, calls `saveData()` to persist the change, and responds with the updated data using the helper `sendJSON()`.

- **CORS handling:** All responses include the necessary `Access‑Control‑Allow‑*` headers. The server also handles `OPTIONS` preflight requests by immediately responding with status `204`.

### Frontend (`frontend/index.html` and `frontend/script.js`)

The frontend is a single‑page application built with [Vue 3](https://vuejs.org/), the [Frappe Gantt](https://frappe.io/gantt) library and [html2canvas](https://html2canvas.hertzen.com/).

The main Vue app is defined in `frontend/script.js`. Key data properties and methods include:

- `programmes` – array of programmes fetched from the API.
- `selectedProgrammeId` and `selectedProgramme` – track which programme is currently selected and store its details.
- `newModuleName` – bound to the input used to create a new module.
- `taskForms` – an object mapping each module’s ID to a temporary form for adding a task.
- `currentModule` – the module currently displayed in the Gantt chart.
- `gantt` – a reference to the Frappe Gantt instance.

Methods:

- `fetchProgrammes()` – called on component mount; fetches the list of programmes from `/api/programmes`.
- `onProgrammeChange()` – triggered when the user selects a programme; fetches the programme’s full details and prepares task form objects for each module.
- `addModule()` – sends a `POST` request to `/api/programmes/<id>/modules` to add a new module; then refreshes the selected programme.
- `addTask(module)` – sends a `POST` request to `/api/modules/<moduleId>/tasks` using values from `taskForms[module.id]`; clears the form and refreshes the selected programme; updates the Gantt chart if the current module matches.
- `showModule(module)` – stores a deep copy of the module in `currentModule` and triggers the Gantt render.
- `renderGantt()` – converts the module’s tasks into the format required by Frappe Gantt (id, name, start, end, etc.) and initializes a new chart.  If a previous chart exists, the container is cleared.
- `downloadChart()` – uses html2canvas to capture the Gantt chart as a PNG and triggers a download.

The HTML file (`frontend/index.html`) contains the form elements and the container for the Gantt chart. Styling is kept minimal and uses a CDN for the Frappe Gantt CSS. Scripts for Vue, Frappe Gantt and html2canvas are loaded from CDN.

## Data Example

The repository includes a sample `data.json` containing the following structure:

```json
{
  "programmes": [
    {
      "id": 1,
      "name": "MSc Cancer Sciences",
      "modules": [
        {
          "id": 1,
          "name": "Research Lab Skills",
          "tasks": [
            {
              "id": 1,
              "name": "Design & Development",
              "start": "2025-09-04",
              "end": "2025-10-24"
            }
          ]
        }
      ]
    }
  ]
}
```

## Running Locally

To run the server locally:

```bash
# install dependencies (none required beyond Node.js)
npm install

# start the server on port 3000 (or the PORT env variable)
node index.js
```

Visit `http://localhost:3000` in your browser to interact with the app.

---

This README describes the purpose of each file and the key functions in both the backend and frontend to help you understand how the project tracker works.
