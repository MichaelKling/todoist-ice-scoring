# Todoist ICE Scoring with Node.js and Docker

This project allows you to automatically calculate **ICE scores** for your Todoist tasks based on labels for **Impact**, **Confidence**, and **Ease**, and then updates the task title with the calculated ICE score. It utilizes the Todoist API and can be triggered via a webhook.

## Features

- Fetch tasks from Todoist using a filter.
- Calculate ICE scores based on task labels (`Impact-X`, `Confidence-X`, `Ease-X`).
- Update the task title in Todoist with the calculated ICE score.
- Deployable via Docker with environment variables for easy configuration.
- Triggerable via webhook.

## Prerequisites

- [Node.js](https://nodejs.org/)
- [Docker](https://www.docker.com/)
- A [Todoist API Token](https://developer.todoist.com/)

## Environment Variables

To run the app, you need to provide the following environment variables:

| Variable            | Description                                                |
|---------------------|------------------------------------------------------------|
| `TODOIST_API_TOKEN`  | Your Todoist API token for accessing your tasks.           |
| `TODOIST_FILTER`     | A Todoist filter to fetch specific tasks. Example: `@ICE`  |
| `PORT`               | The port on which the server will run (default is 3000).   |

You can set these variables in a `.env` file for local development or pass them directly when running via Docker.

## Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/todoist-ice-scoring.git
    cd todoist-ice-scoring
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file with your Todoist credentials:

    ```env
    TODOIST_API_TOKEN=your_todoist_api_token
    TODOIST_FILTER=your_filter
    PORT=3000
    ```

4. Run the app locally:

    ```bash
    npm start
    ```

## Docker Deployment

1. Build the Docker image:

    ```bash
    docker build -t todoist-ice-scoring .
    ```

2. Run the Docker container with environment variables:

    ```bash
    docker run -d \
      --env-file .env -p 3000:3000 \
      todoist-ice-scoring
    ```

## Triggering the Webhook

To trigger the task processing, send a POST request to the webhook endpoint:

### URL

   ```plaintext
   POST http://localhost:3000/webhook
   ```

You can use tools like Postman or curl to send this request.

### Example with curl:

   ```bash
   curl -X POST http://localhost:3000/webhook
   ```

### Example Todoist Labels

For each task in Todoist, add the following labels to score them:

- **Impact**: `Impact-1`, `Impact-2`, ..., `Impact-10`
- **Confidence**: `Confidence-1`, `Confidence-2`, ..., `Confidence-10`
- **Ease**: `Ease-1`, `Ease-2`, ..., `Ease-10`

Alternatively short labels can be used: `I-1`, `C-1`, `E-1`

### How the ICE Score Is Calculated

The ICE score is calculated using the following formula:

ICE Score = (Impact * Confidence * Ease) / 10

The score is added to the beginning of the task title, like this:

`ICE-S 72.0: Your Task Name`

## License

This project is licensed under the MIT License.
