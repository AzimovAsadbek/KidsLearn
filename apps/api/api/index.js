// Vercel serverless entrypoint. Every route (a vercel.json rewrite sends the
// whole path space here) is handled by the same cached Nest/Express app that
// main.ts serves — see src/serverless.ts.
const { getServer } = require("../dist/serverless");

module.exports = async (req, res) => {
  const server = await getServer();
  return server(req, res);
};
