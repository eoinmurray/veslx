import type { Root, Content } from 'mdast'

/**
 * Remark plugin that transforms MDX content into slides.
 * Splits content at thematic breaks (---) and wraps each section
 * in a <Slide index={n}> component.
 *
 * Also exports `slideCount` from the MDX module.
 *
 * Note: This plugin should run AFTER remark-frontmatter so that
 * YAML frontmatter is already extracted and won't be confused with
 * slide breaks.
 */
export function remarkSlides() {
  return (tree: Root) => {
    const slides: Content[][] = [[]]
    let frontmatterNode: Content | null = null

    // Split children by thematic breaks (skip yaml/toml frontmatter nodes)
    for (const node of tree.children) {
      if (node.type === 'thematicBreak') {
        // Start a new slide
        slides.push([])
      } else if (node.type === 'yaml' || (node.type as string) === 'toml') {
        // Keep frontmatter to add back later
        frontmatterNode = node
      } else {
        // Add to current slide
        slides[slides.length - 1].push(node)
      }
    }

    // Filter out empty slides
    const nonEmptySlides = slides.filter(slide => slide.length > 0)

    // Build new tree with Slide wrappers
    const newChildren: Content[] = []

    // Preserve frontmatter at the top (for remark-mdx-frontmatter to process)
    if (frontmatterNode) {
      newChildren.push(frontmatterNode)
    }

    // Add slideCount export
    newChildren.push({
      type: 'mdxjsEsm',
      value: `export const slideCount = ${nonEmptySlides.length};`,
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          body: [{
            type: 'ExportNamedDeclaration',
            declaration: {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations: [{
                type: 'VariableDeclarator',
                id: { type: 'Identifier', name: 'slideCount' },
                init: { type: 'Literal', value: nonEmptySlides.length }
              }]
            },
            specifiers: [],
            source: null
          }]
        }
      }
    } as any)

    // Wrap each slide's content in a Slide component
    nonEmptySlides.forEach((slideContent, index) => {
      // Opening <Slide index={n}>
      newChildren.push({
        type: 'mdxJsxFlowElement',
        name: 'Slide',
        attributes: [{
          type: 'mdxJsxAttribute',
          name: 'index',
          value: {
            type: 'mdxJsxAttributeValueExpression',
            value: String(index),
            data: {
              estree: {
                type: 'Program',
                sourceType: 'module',
                body: [{
                  type: 'ExpressionStatement',
                  expression: { type: 'Literal', value: index }
                }]
              }
            }
          }
        }],
        children: slideContent
      } as any)
    })

    tree.children = newChildren
  }
}
