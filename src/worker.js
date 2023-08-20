const { Client } = require('@notionhq/client');

// Caching duration in seconds
const CACHE_DURATION = 28800;

export default {
	async fetch(request, env, ctx) {
		const pathName = new URL(request.url).pathname;

		// If path is root, redirect to the homepage
		if (pathName === '/') {
			return Response.redirect('https://cncrse.com/', 302);
		}

		// If favicon, return 404
		if (pathName === '/favicon.ico') {
			return new Response('Not found', { status: 404 });
		}

		// Check if path is cached in KV
		var target = await env.REDIRECTS.get(pathName);

		if (target === '404') {
			return new Response('Not found', { status: 404 });
		}

		// If path is not cached, fetch from Notion
		if (target === null) {
			// Initialize Notion client
			const notion = new Client({ auth: env.NOTION_API_KEY });

			// Query the database for the path
			const response = await notion.databases.query({
				database_id: env.NOTION_DATABASE_ID,
				filter: {
					property: 'Name',
					title: { equals: pathName },
				},
			});

			// If no results, return 404
			if (response.results.length === 0) {
				// Cache 404 for 8 hours to the KV
				await env.REDIRECTS.put(pathName, '404', { expirationTtl: CACHE_DURATION });

				// Yes, it causes overhead, but I don't want to duplicate the code
				return await this.fetch(request, env, ctx);
			}

			// Get the first result and redirect the user to the URL
			// defined in the database entry called "Target"
			target = response.results[0].properties.Target.url;

			// Cache path and redirect for 8 hours to the KV
			await env.REDIRECTS.put(pathName, target, { expirationTtl: CACHE_DURATION });
		}

		// Return a 302 redirect to the target url
		return Response.redirect(target, 302);
	},
};
