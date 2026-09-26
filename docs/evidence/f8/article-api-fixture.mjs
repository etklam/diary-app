// Read-only synthetic API used for emulator acceptance. It does not connect to or write to PostgreSQL.
import { createServer } from 'node:http'

const timestamp = '2026-09-26T12:00:00.000Z'
const articles = Array.from({ length: 10 }, (_, index) => ({
  id: String(900000001 + index),
  title: index === 0 ? 'Synthetic article: research notes' : `Synthetic article: note ${index + 1}`,
  slug: index === 0 ? 'synthetic-acceptance-article' : `synthetic-acceptance-${String(index + 1).padStart(2, '0')}`,
  excerpt: index === 0 ? 'A fixture used to verify native published-article rendering.' : 'A synthetic pagination row.',
  coverImage: index === 0 ? '/uploads/synthetic-article.png' : null,
  category: 'market',
  tags: 'acceptance,synthetic',
  publishedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
  author: { id: '900000002', name: 'F8 QA' },
  content: index === 0
    ? '# Synthetic article body\n\nThis **published fixture** verifies rich native Markdown reading.\n\n- Research context\n- Decision notes\n\n| Signal | Reading |\n| --- | --- |\n| Sample | Synthetic |\n\n[Fixture source](https://example.test/research)\n'
    : `# Synthetic note ${index + 1}\n\nA public pagination fixture.\n`,
}))
const articlesBySlug = new Map(articles.map(item => [item.slug, item]))

function send(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(value))
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:3102')
  if (request.method !== 'GET') return send(response, 405, { error: 'read-only fixture' })
  if (url.pathname === '/api/blog') {
    const search = (url.searchParams.get('search') ?? '').toLocaleLowerCase()
    const category = url.searchParams.get('category')
    const matching = articles.filter(item => (!search || `${item.title} ${item.excerpt} ${item.content}`.toLocaleLowerCase().includes(search))
      && (!category || category === item.category))
    const page = Number(url.searchParams.get('page') ?? 1)
    const data = matching.slice((page - 1) * 9, page * 9).map(({ content, ...item }) => item)
    return send(response, 200, { data, pagination: { page, limit: 9, total: matching.length, totalPages: Math.ceil(matching.length / 9) } })
  }
  const detail = url.pathname.match(/^\/api\/blog\/([^/]+)$/)
  if (detail) {
    const article = articlesBySlug.get(decodeURIComponent(detail[1]))
    if (article) return send(response, 200, article)
  }
  return send(response, 404, { success: false, data: { code: 'BLOG_NOT_FOUND', message: 'Post not found' } })
})

server.listen(3102, '0.0.0.0', () => process.stdout.write('Read-only Articles fixture listening on 0.0.0.0:3102\n'))
