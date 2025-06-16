import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

export const client = createClient({
  projectId: 'acg1tvxx',
  dataset: 'production',
  useCdn: true, // Enable for faster, cached responses
  apiVersion: '2024-01-01',
  // token: import.meta.env.VITE_SANITY_API_TOKEN, // Optional: for authenticated requests
})

// Helper for generating image URLs
const builder = imageUrlBuilder(client)
export const urlFor = (source) => builder.image(source)

// Fetch all projects
export async function getProjects() {
  return client.fetch(`
    *[_type == "project"] | order(year desc) {
      _id,
      title,
      slug,
      description,
      year,
      metaCompany,
      metaCompanyMobile,
      type,
      externalUrl,
      tags,
      images[] {
        asset,
        alt,
        caption
      }
    }
  `)
}

// Fetch single project by slug
export async function getProject(slug) {
  return client.fetch(`
    *[_type == "project" && slug.current == $slug][0] {
      _id,
      title,
      slug,
      description,
      year,
      metaCompany,
      metaCompanyMobile,
      type,
      externalUrl,
      tags,
      images[] {
        asset,
        alt,
        caption
      }
    }
  `, { slug })
} 
