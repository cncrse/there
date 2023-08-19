const { Client } = require('@notionhq/client');

export default {
	async fetch(request, env, ctx) {
		const pathName = new URL(request.url).pathname;
		const notion = new Client({ auth: env.NOTION_API_KEY });
		const response = await notion.databases.query({
			database_id: env.NOTION_DATABASE_ID,
			filter: {
				property: 'Name',
				title: { equals: pathName },
			},
		});

		// If no results, return 404
		if (response.results.length === 0) {
			return new Response('Not found', { status: 404 });
		}

		// Get first result and redirect user to the url defined in the database entry called `Target`
		const data = response.results[0].properties;
		const target = data.Target.url;

		// Return a 302 redirect to the target url
		return Response.redirect(target, 302);
	},
};
