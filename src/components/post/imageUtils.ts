import {createImageUrlBuilder} from '@sanity/image-url'
import type {SanityClient} from '@sanity/client'
import type {SanityImageSource} from '@sanity/image-url'

export function createImageHelpers(client: SanityClient) {
  const builder = createImageUrlBuilder(client)

  function urlFor(source: SanityImageSource) {
    return builder.image(source)
  }

  function generateImageProps(image: SanityImageSource, sizes: string) {
    const base = urlFor(image).quality(90).auto('format')
    return {
      src: base.width(800).url(),
      srcset: [400, 800, 1200, 1600, 2000]
        .map((width) => `${base.width(width).url()} ${width}w`)
        .join(', '),
      sizes,
    }
  }

  return {generateImageProps, urlFor}
}
