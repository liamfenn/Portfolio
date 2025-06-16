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
      title: 'Company',
      type: 'string',
      description: 'Company name for collaboration'
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
      description: 'Link to the live project or website (optional)'
    },

    {
      name: 'media',
      title: 'Project Media',
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
        },
        {
          type: 'file',
          options: {
            accept: 'video/*'
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
