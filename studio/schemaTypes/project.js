export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      validation: Rule => Rule.required()
    },
    {
      name: 'year',
      title: 'Year',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'metaCompany',
      title: 'Company (Desktop)',
      type: 'string',
      description: 'Company name for desktop view'
    },
    {
      name: 'metaCompanyMobile',
      title: 'Company (Mobile)',
      type: 'string',
      description: 'Abbreviated company name for mobile view'
    },
    {
      name: 'type',
      title: 'Project Type',
      type: 'string',
      options: {
        list: [
          {title: 'Internal', value: 'internal'},
          {title: 'External', value: 'external'},
          {title: 'Archive', value: 'archive'}
        ]
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',
      description: 'Only for external projects (Bird, HCC, etc.)',
      hidden: ({document}) => document?.type !== 'external'
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags'
      }
    },
    {
      name: 'images',
      title: 'Project Images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true
          },
          fields: [
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: Rule => Rule.required()
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string'
            }
          ]
        }
      ]
    }
  ],
  preview: {
    select: {
      title: 'title',
      year: 'year',
      type: 'type',
      media: 'images.0'
    },
    prepare(selection) {
      const {title, year, type} = selection
      return {
        title: title,
        subtitle: `${year} • ${type}`
      }
    }
  }
} 
