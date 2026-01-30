# Applytics

A modern, offline-first desktop application designed to  organize and track your job applications efficiently. Built with **React**, **TypeScript**, **Electron**, and **SQLite**.

![Dashboard Preview](public/dashboard-preview.png)

## Features

-   **Dashboard Analytics**: comprehensive overview including:
    -   **Total Application Count**: Track your lifetime application volume.
    -   **Weekly Application Trend**: Monitor your productivity with week-over-week comparisons and trend indicators.
    -   **Interview Rate**: Visualize your conversion rate from application to interview.
    -   **Average Response Time**: Track how long companies take to respond.
    -   **Role Analysis**: Breakdown applications by job title keywords.
    -   **Status Distribution**: Visual doughnut chart of your current application pipeline.
-   **Kanban Board**: Interactive drag-and-drop board to manage application lifecycle stages.
-   **Application Timeline**: Detailed history of every status change and note for each application.
-   **Company Profiles**: Aggregated views of all applications to specific companies.
-   **Offline First**: Secure, local SQLite database storage.
-   **Data Import**: Bulk import capabilities from Excel/CSV files for easy migration.

## Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS, Chart.js, Lucide React
-   **Backend**: Electron (Main Process), Better-SQLite3
-   **Build Tool**: Vite

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v16 or higher recommended)
-   npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/jwhiss/applytics.git
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

Dependencies are installed in node_modules/ and require approximately 800MB of storage space.

### Running Locally

To run the application in production mode:

```bash
npm start
```

To run the application in development mode with hot-reloading:

```bash
npm run dev
```

This command runs Vite for the React frontend and launches the Electron window.

### Building for Production

To create a production build (distributable executable):

```bash
npm run package
```

The output will be located in the `dist-electron` or `release` directory depending on configuration.

## Data Storage

Application data is stored in a local SQLite database file:
-   **Development**: `tracker.db` in the project root.
-   **Production**: `tracker.db` in your system's User Data folder (e.g., `~/Library/Application Support/ApplicationTracker/` on macOS).

## License

Distributed under the GPL 3.0 License. See `LICENSE` for more information.
