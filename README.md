# Automated Remote Job Aggregator

This project is a serverless data pipeline and frontend interface. I built it to aggregate remote software engineering jobs.

It runs entirely on n8n and Google Sheets.

The backend is an event-driven n8n workflow. It fetches new job postings from an external API every hour. I wrote custom JavaScript to strip HTML tags and clean the text. The workflow checks existing records in a Google Sheet to prevent duplicates. It then appends new jobs in batches. This keeps API calls low and prevents rate limits.

The frontend is a lightweight single-page application.

I used vanilla HTML, CSS, and JavaScript. No external libraries. It fetches the published Google Sheet CSV and parses it into interactive job cards. And the design is a minimal dark mode interface.

I built this to solve a specific problem. Searching for jobs takes too much time. This system automates the search and collection process. It runs quietly in the background. So it requires zero manual input.
