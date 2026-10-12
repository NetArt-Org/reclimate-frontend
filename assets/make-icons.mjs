// Builds the app icon and splash source images (assets/*.png) from the app's own mark: the leaf on a lime tile,
// on brand green — as on the login screen. Then `npx @capacitor/assets generate` makes every Android/iOS size.
//   node assets/make-icons.mjs && npx @capacitor/assets generate --android --ios
import sharp from "sharp"

const BRAND = "#1f5a3d"
const LIME = "#cdebb0"
const INK = "#173f2c"
const LEAF = `<path d="M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20"/><path d="M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13"/>`
const leaf = (x, y, size, color) =>
  `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LEAF}</g>`

// Full icon: brand background, lime rounded tile, dark leaf.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${BRAND}"/>
  <rect x="192" y="192" width="640" height="640" rx="150" fill="${LIME}"/>
  ${leaf(272, 272, 480, INK)}
</svg>`
// Adaptive icon (Android): foreground on transparent, inside the 66% safe zone; plain brand background.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect x="277" y="277" width="470" height="470" rx="110" fill="${LIME}"/>
  ${leaf(337, 337, 350, INK)}
</svg>`
const background = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BRAND}"/></svg>`
// Splash: brand background with the tile in the middle.
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732">
  <rect width="2732" height="2732" fill="${BRAND}"/>
  <rect x="1116" y="1116" width="500" height="500" rx="118" fill="${LIME}"/>
  ${leaf(1178, 1178, 376, INK)}
</svg>`

const out = (svg, file) => sharp(Buffer.from(svg)).png().toFile(new URL(file, import.meta.url).pathname)
await Promise.all([
  out(icon, "icon-only.png"),
  out(foreground, "icon-foreground.png"),
  out(background, "icon-background.png"),
  out(splash, "splash.png"),
  out(splash, "splash-dark.png"),
])
console.log("assets written")
