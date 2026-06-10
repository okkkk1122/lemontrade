const request = require('supertest');

function extractCsrf(html) {
  const meta = html.match(/name="csrf-token"\s+content="([^"]+)"/);
  if (meta) return meta[1];
  const input = html.match(/name="_csrf"\s+value="([^"]+)"/);
  return input ? input[1] : null;
}

async function loginAgent(app, email, password) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = extractCsrf(page.text);
  const res = await agent
    .post('/login')
    .type('form')
    .send({ identifier: email, password, _csrf: csrf });
  return { agent, status: res.status, location: res.headers.location };
}

module.exports = { extractCsrf, loginAgent };
