import {
  ArrowLeft, ArrowRight, BadgeCheck, BatteryMedium, BookOpen, Building2, CalendarCheck, Camera, Check, CheckCheck,
  ChevronDown, ChevronRight, Circle, CircleCheck, CircleDashed, CircleX, ClipboardCheck, CloudCheck, CloudOff,
  CloudUpload, Coins, CookingPot, CornerDownLeft, Cylinder, Droplets, Eye, Flame, FlameKindling, FlaskConical, Gauge,
  Hand, HandCoins, Hash, History, Hourglass, House, IdCard, Image, ImagePlus, Images, Info, Languages, Leaf, ListChecks,
  Loader, LoaderCircle, LocateFixed, Lock, LogOut, Mail, MapPin, MapPinCheck, MessageSquareWarning, Mountain,
  PartyPopper, Pencil, Phone, Play, Plus, Repeat, RotateCcw, Ruler, Send, Settings2, ShieldCheck, ShoppingBag, Shovel,
  Signal, Sprout, TestTube, ThumbsUp, Trash2, Trees, TriangleAlert, Truck, UserRound, Users, Video, Warehouse, Weight,
  Wheat, Wifi, WifiOff, X, type LucideIcon, type LucideProps,
} from "lucide-react"

/**
 * Icons are referenced by name (kebab-case, as in the design's `lucide:*` ids)
 * so data stays JSON-serialisable (localStorage today, an API tomorrow).
 */
const ICONS = {
  "arrow-left": ArrowLeft, "arrow-right": ArrowRight, "badge-check": BadgeCheck, "battery-medium": BatteryMedium,
  "book-open": BookOpen, "building-2": Building2, "calendar-check": CalendarCheck, camera: Camera, check: Check,
  "check-check": CheckCheck, "chevron-down": ChevronDown, "chevron-right": ChevronRight, circle: Circle,
  "circle-check": CircleCheck, "circle-dashed": CircleDashed, "circle-x": CircleX, "clipboard-check": ClipboardCheck,
  "cloud-check": CloudCheck, "cloud-off": CloudOff, "cloud-upload": CloudUpload, coins: Coins, "cooking-pot": CookingPot,
  "corner-down-left": CornerDownLeft, cylinder: Cylinder, droplets: Droplets, eye: Eye, flame: Flame,
  "flame-kindling": FlameKindling, "flask-conical": FlaskConical, gauge: Gauge, hand: Hand, "hand-coins": HandCoins,
  hash: Hash, history: History, hourglass: Hourglass, house: House, "id-card": IdCard, image: Image,
  "image-check": ImagePlus, images: Images, info: Info, languages: Languages, leaf: Leaf, "list-checks": ListChecks,
  loader: Loader, "loader-circle": LoaderCircle, "locate-fixed": LocateFixed, lock: Lock, "log-out": LogOut, mail: Mail,
  "map-pin": MapPin, "map-pin-check": MapPinCheck, "message-square-warning": MessageSquareWarning, mountain: Mountain,
  "party-popper": PartyPopper, pencil: Pencil, phone: Phone, play: Play, plus: Plus, repeat: Repeat,
  "rotate-ccw": RotateCcw, ruler: Ruler, send: Send, "settings-2": Settings2, "shield-check": ShieldCheck,
  "shopping-bag": ShoppingBag, shovel: Shovel, signal: Signal, sprout: Sprout, "test-tube": TestTube,
  "thumbs-up": ThumbsUp, "trash-2": Trash2, trees: Trees, "triangle-alert": TriangleAlert, truck: Truck,
  "user-round": UserRound, users: Users, video: Video, warehouse: Warehouse, weight: Weight, wheat: Wheat, wifi: Wifi,
  "wifi-off": WifiOff, x: X,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName
  /** Square size in px (the design specifies icons by width/height). */
  size?: number
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const Cmp = ICONS[name]
  return <Cmp width={size} height={size} strokeWidth={2} aria-hidden {...props} />
}
