import { handleRequest } from 'layer:test'

export default (req: Request) => handleRequest(req)

export const config = () => ({
  path: '/with-layer',
})
