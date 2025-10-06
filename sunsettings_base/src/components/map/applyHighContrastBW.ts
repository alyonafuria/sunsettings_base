import type mapboxgl from "mapbox-gl"

/**
 * Applies high contrast black and white styling to a Mapbox map
 * @param map - The Mapbox map instance to style
 */
export const applyHighContrastBW = (map: mapboxgl.Map): void => {
  const layers = (map.getStyle()?.layers || []) as mapboxgl.Layer[]
  const setPaint = (layerId: string, prop: string, value: unknown) => {
    try {
      (map.setPaintProperty as unknown as (id: string, p: string, v: unknown) => void)(layerId, prop, value)
    } catch {
      // ignore
    }
  }

  // Color palette for high contrast styling
  const LAND = "#ffffff"
  const LAND_ALT = "#f2f2f2"
  const WATER = "#e6e6e6"
  const ROAD_MAIN = "#000000"
  const ROAD_SEC = "#222222"
  const OUTLINE = "#000000"
  const BUILDING = "#d0d0d0"
  const PARK = "#ededed"
  const TEXT = "#000000"
  const ICON = "#111111"

  layers.forEach((layer) => {
    const { id, type } = layer
    try {
      // Background
      if (type === "background") {
        map.setPaintProperty(id, "background-color", LAND)
      }

      const idLower = id.toLowerCase()

      // Water
      if (idLower.includes("water")) {
        if (type === "fill") map.setPaintProperty(id, "fill-color", WATER)
        if (type === "line") map.setPaintProperty(id, "line-color", WATER)
      }

      // Parks / green areas
      if (idLower.includes("park") || idLower.includes("green") || idLower.includes("landuse")) {
        if (type === "fill") map.setPaintProperty(id, "fill-color", PARK)
      }

      // Buildings
      if (idLower.includes("building")) {
        if (type === "fill") {
          map.setPaintProperty(id, "fill-color", BUILDING)
          map.setPaintProperty(id, "fill-outline-color", OUTLINE)
        }
      }

      // Roads
      if (idLower.includes("road") || idLower.includes("street") || idLower.includes("highway")) {
        if (type === "line") {
          const main = idLower.includes("motorway") || idLower.includes("trunk") || idLower.includes("primary")
          map.setPaintProperty(id, "line-color", main ? ROAD_MAIN : ROAD_SEC)
          // Boost contrast by widening slightly (ignore failures)
          try {
            const currentWidth = map.getPaintProperty(id, "line-width")
            if (typeof currentWidth === "number") {
              map.setPaintProperty(id, "line-width", Math.max(currentWidth, main ? 2.4 : 1.4))
            } else {
              map.setPaintProperty(id, "line-width", main ? 2.4 : 1.4)
            }
          } catch {
            // Ignore errors when setting line width
          }
        }
      }

      // Generic fills (landuse etc.)
      if (type === "fill" && !idLower.includes("water") && !idLower.includes("park") && !idLower.includes("building")) {
        map.setPaintProperty(id, "fill-color", LAND_ALT)
        try {
          map.setPaintProperty(id, "fill-outline-color", "#bfbfbf")
        } catch {
          // Ignore errors when setting outline color
        }
      }

      // Lines not already touched
      if (type === "line" && !idLower.includes("road") && !idLower.includes("water")) {
        map.setPaintProperty(id, "line-color", "#4d4d4d")
      }

      // Symbols (labels/icons)
      if (type === "symbol") {
        try {
          map.setPaintProperty(id, "text-color", TEXT)
          map.setPaintProperty(id, "icon-color", ICON)
          map.setPaintProperty(id, "text-halo-color", "#ffffff")
          map.setPaintProperty(id, "text-halo-width", 1.2)
          map.setPaintProperty(id, "text-halo-blur", 0.2)
        } catch {
          // Ignore errors when setting symbol properties
        }
      }

      // Circles (POIs)
      if (type === "circle") {
        map.setPaintProperty(id, "circle-color", "#111111")
        try {
          map.setPaintProperty(id, "circle-stroke-color", "#ffffff")
          map.setPaintProperty(id, "circle-stroke-width", 0.6)
        } catch {
          // Ignore errors when setting circle properties
        }
      }

      // Hillshade
      if (type === "hillshade") {
        try {
          map.setPaintProperty(id, "hillshade-shadow-color", "#333333")
          map.setPaintProperty(id, "hillshade-highlight-color", "#bbbbbb")
        } catch {
          // Ignore errors when setting hillshade properties
        }
      }

      // Desaturate where possible
      const saturationProps = [
        "fill-saturation",
        "line-saturation",
        "background-saturation",
        "circle-saturation",
        "symbol-saturation",
      ] as const
      saturationProps.forEach((prop) => {
        setPaint(id, prop, -1)
      })

      // Remove hue/brightness variance
      const adjustments = [
        "fill-brightness-min",
        "fill-brightness-max",
        "line-brightness-min",
        "line-brightness-max",
      ] as const
      adjustments.forEach((prop) => {
        setPaint(id, prop, 0)
      })
    } catch {
      // Ignore errors for individual layer styling
    }
  })
}
