// Vercel entry point: every request that is not a static file in public/ runs through the same
// handler `node server.js` listens with. Configuration comes from the project's environment
// variables (SUPABASE_URL and SUPABASE_SECRET_KEY); uploads go to Supabase Storage there, since
// the host's disk is read-only (see supadb.js). Routing and static files: vercel.json.
module.exports = require('../server.js');
