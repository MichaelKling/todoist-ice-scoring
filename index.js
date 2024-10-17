// Import required modules
const axios = require('axios');
const express = require('express');
// Load environment variables
require('dotenv').config();

// Create an Express application
const app = express();
const PORT = process.env.PORT || 3000;
const PREFIX = "ICE-S";

// Middleware to parse JSON bodies
app.use(express.json());

// Todoist API token and filter from environment variables
const API_TOKEN = process.env.TODOIST_API_TOKEN;
const FILTER = process.env.TODOIST_FILTER;

// Todoist API endpoint
const TODOIST_API_URL = 'https://api.todoist.com/rest/v2';

// Set up headers for authentication
const headers = {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
};

let lastProcessedTime = 0; // Timestamp for the last processed request
const MIN_INTERVAL = 5000; // Minimum time interval between requests (in milliseconds)
let isProcessing = false; // Flag to indicate if a process is in progress

// Function to get tasks from Todoist using a filter
async function getTasks() {
    try {
        const response = await axios.get(`${TODOIST_API_URL}/tasks`, {
            headers: headers,
            params: {
                filter: FILTER
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching tasks:', error.response ? error.response.data : error);
        return [];
    }
}

// Function to get label value, supporting short and long names (e.g., Impact and I)
function getLabelValue(task, labelType) {
    const longLabel = task.labels.find((l) => l.toLowerCase().startsWith(labelType.toLowerCase() + '-')); // Long: Impact-7
    const shortLabel = task.labels.find((l) => l.toLowerCase().startsWith(labelType.charAt(0).toLowerCase() + '-')); // Short: I-7
    const label = longLabel || shortLabel;

    if (label) {
        const value = label.split('-')[1]; // Extract value from label (e.g., Impact-7 or I-7)
        return parseInt(value, 10);
    }
    return null;
}


// Function to determine priority based on ICE score
function determinePriority(iceScore) {
    if (iceScore >= 70) return 4; // High Priority
    if (iceScore >= 50) return 3; // Medium-High Priority
    if (iceScore >= 30) return 2; // Medium-Low Priority
    return 1; // Low Priority
}


// Function to calculate ICE score
function calculateICEScore(impact, confidence, ease) {
    return ((impact || 1) * (confidence || 1) * (ease || 1)) / 10;
}

// Function to update a task with the ICE score
async function updateTaskWithICEScore(task, iceScore) {
    const paddedIceScore = iceScore.toFixed(1).padStart(4, '0');
    const updatedTaskName = `${PREFIX} ${paddedIceScore}: ` +
        task.content.replace(new RegExp(`^${PREFIX} \\d+(\\.\\d+)?: `), ''); // Remove existing ICE score if present
    const priority = determinePriority(iceScore); // Get priority based on ICE score

    try {
        await axios.post(`${TODOIST_API_URL}/tasks/${task.id}`,
            {
                content: updatedTaskName,
                priority: priority
              },
            { headers: headers }
        );
        console.log(`Task updated: ${updatedTaskName} with ${priority}`);
    } catch (error) {
        console.error(`Error updating task ${task.id}:`, error);
    }
}

// Function to extract existing ICE score from task content
function getExistingICEScore(task) {
    const icePattern = /^ICE (\d+(\.\d+)?)\:/; // Matches 'ICE 72.0:'
    const match = task.content.match(icePattern);
    return match ? parseFloat(match[1]) : null; // Return the existing score or null
}

// Main function to process tasks and calculate ICE scores
async function processTasks() {
    const tasks = await getTasks();
    for (const task of tasks) {

        const impact = getLabelValue(task, 'Impact'); // Check for both `Impact` and `I`
        const confidence = getLabelValue(task, 'Confidence'); // Check for both `Impact` and `C`
        const ease = getLabelValue(task, 'Ease'); // Check for both `Impact` and `E`

        if (impact !== null && confidence !== null && ease !== null) {
            // Get existing ICE score if present
            const existingIceScore = getExistingICEScore(task);
            // Calculate new ICE score
            const newIceScore = calculateICEScore(impact, confidence, ease);

            // If there is a valid new ICE score and it differs from the existing score, update the task
            if (newIceScore && (existingIceScore !== newIceScore)) {
                await updateTaskWithICEScore(task, newIceScore);
            } else {
                console.log(`Skipping task due to unchanged score: ${task.content}`);
            }
        } else {
            console.log(`Skipping task due to missing labels: ${task.content}`);
        }
    }
}

// Define a webhook endpoint to trigger the processing of tasks
app.post('/webhook', async (req, res) => {
    try {
        const currentTime = Date.now();

        // Check if we should process the tasks (5 seconds flood protection)
        if (isProcessing || currentTime - lastProcessedTime < MIN_INTERVAL) {
            console.log('Skipping processing to avoid flooding.');
            return res.status(200).send('Already processing webhooks. Please wait.');
        }

        // Update the last processed time
        lastProcessedTime = currentTime;

        console.log('Webhook received. Processing tasks...');
	isProcessing = true;

	setTimeout(async () => {
		try {
	             console.log('Processing tasks now...');
		     await processTasks();
	             console.log('Tasks processed successfully.');
        	} catch (error) {
	             console.error('Error processing tasks:', error);
		} finally {
		    isProcessing = false;
		}
	}, MIN_INTERVAL);

        res.status(200).send('Processing Tasks.');
    } catch (error) {
        console.error('Error processing tasks:', error);
        res.status(500).send('Error processing tasks.');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
