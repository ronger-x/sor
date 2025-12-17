import { defineMcpResource } from '@nuxtjs/mcp-toolkit'

export default defineMcpResource({
  name: 'readme',
  file: 'README.md', // Relative to project root
  metadata: {
    description: 'Project README file'
  }
})
