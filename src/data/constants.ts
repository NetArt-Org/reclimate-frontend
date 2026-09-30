import type { IconName } from "@/components/common/Icon"
import type {
  BatchStatus, DayDef, Localized, RejectReason, SetupCategoryDef, SetupFormFieldDef,
} from "@/types"

export type BadgeTone = "info" | "warn" | "success" | "danger"

/** Carbon factor (credits per litre), credit price (Rp) and the buyer payout goal. */
export const CREDIT_FACTOR = 0.1
export const CREDIT_PRICE = 150000
export const CREDIT_GOAL = 1000

export const rid = () => Math.random().toString(36).slice(2, 9)

/** Display names for the built-in biomass types. */
export const BIO: Record<string, Localized> = { 'Corn Cob': { en: 'Corn cob', id: 'Tongkol jagung' }, 'Wood waste': { en: 'Wood waste', id: 'Limbah kayu' }, 'Patchouli waste': { en: 'Patchouli waste', id: 'Limbah nilam' } };
export const STATUS_META: Record<BatchStatus, { label: Localized; tone: BadgeTone; icon: IconName }> = {
  progress: { label: { en: 'In progress', id: 'Berjalan' }, tone: 'info', icon: 'loader' },
  waiting: { label: { en: 'Waiting approval', id: 'Menunggu' }, tone: 'warn', icon: 'hourglass' },
  approved: { label: { en: 'Approved', id: 'Disetujui' }, tone: 'success', icon: 'badge-check' },
  rejected: { label: { en: 'Rejected', id: 'Ditolak' }, tone: 'danger', icon: 'circle-x' },
  done: { label: { en: 'Complete', id: 'Selesai' }, tone: 'success', icon: 'check-check' },
}
export const DAYS: DayDef[] = [
  { n: 1, icon: 'wheat', name: { en: 'Collect biomass', id: 'Kumpulkan biomassa' }, steps: [
    { title: { en: 'Who gave the biomass?', id: 'Siapa pemberi biomassa?' }, ins: { en: 'Pick a source or a farmer.', id: 'Pilih sumber atau petani.' }, ill: 'farmer handing over sacks', fields: [
      { k: 'source', type: 'choice', from: 'source', addKey: 'sources', label: { en: 'Source', id: 'Sumber' }, opts: [
        { v: 'Pak Masri Malay', sub: { en: 'Biomass source', id: 'Sumber biomassa' }, icon: 'warehouse' },
        { v: 'Pasaman Barat Farms', sub: { en: 'Biomass source', id: 'Sumber biomassa' }, icon: 'warehouse' },
        { v: 'Pak Fitra KP Hidup Basamo', sub: { en: 'Farmer · 813-6394-5159', id: 'Petani · 813-6394-5159' }, icon: 'user-round' }] }] },
    { title: { en: 'What and how much?', id: 'Apa dan berapa banyak?' }, ins: { en: 'Choose the waste type, then weigh it.', id: 'Pilih jenis limbah, lalu timbang.' }, ill: 'sacks on a weighing scale', fields: [
      { k: 'btype', type: 'choice', from: 'bioref', addKey: 'bioref', label: { en: 'Type', id: 'Jenis' }, opts: [
        { v: 'Corn Cob', label: BIO['Corn Cob'], icon: 'wheat' },
        { v: 'Wood waste', label: BIO['Wood waste'], icon: 'trees' },
        { v: 'Patchouli waste', label: BIO['Patchouli waste'], icon: 'sprout' }] },
      { k: 'qty', type: 'number', label: { en: 'Weight', id: 'Berat' }, units: ['kg', 'ton'], uk: 'unit' }] },
    { title: { en: 'How did it arrive?', id: 'Bagaimana dibawa?' }, ins: { en: 'Tell us how the biomass came to the site.', id: 'Bagaimana biomassa sampai ke lokasi.' }, ill: 'cart or pickup truck', fields: [
      { k: 'transport', type: 'choice', label: { en: 'Transport', id: 'Transportasi' }, opts: [
        { v: 'Manual', label: { en: 'By hand or cart', id: 'Manual atau gerobak' }, icon: 'hand' },
        { v: 'Vehicle', label: { en: 'Truck or car', id: 'Truk atau mobil' }, icon: 'truck' }] }] },
    { title: { en: 'Take photos of the biomass', id: 'Foto biomassa' }, ins: { en: 'Show the whole pile or all the sacks.', id: 'Tampilkan seluruh tumpukan atau karung.' }, ill: 'pile of corn cobs', fields: [
      { k: 'bphoto', type: 'media', kind: 'photo', need: 2, label: { en: 'Biomass photos', id: 'Foto biomassa' }, tip: { en: 'Whole pile in view, in daylight', id: 'Seluruh tumpukan terlihat, terang' } }] },
  ] },
  { n: 2, icon: 'flame', name: { en: 'Burn', id: 'Bakar' }, steps: [
    { title: { en: 'Choose the kiln', id: 'Pilih tungku' }, ins: { en: 'Which kiln are you using today?', id: 'Tungku mana yang dipakai hari ini?' }, ill: 'kiln at the site', fields: [
      { k: 'kiln', type: 'choice', from: 'kilns', addKey: 'kilns', label: { en: 'Kiln', id: 'Tungku' }, opts: ['Masri Malay 5', 'Masri Malay 6', 'Masri Malay 7'].map(v => ({ v, icon: 'flame-kindling' })) }] },
    { title: { en: 'Check the moisture', id: 'Cek kelembapan' }, ins: { en: 'Measure 5 spots. Take a photo of the meter screen each time.', id: 'Ukur 5 titik. Foto layar alat ukur setiap kali.' }, ill: 'moisture meter screen', fields: [
      { k: 'moist', type: 'moist', label: { en: 'Readings', id: 'Bacaan' }, tip: { en: 'Numbers on the screen are sharp', id: 'Angka di layar terlihat jelas' } }] },
    { title: { en: 'Start the burn', id: 'Mulai pembakaran' }, ins: { en: 'Light the kiln, then tap Start. We count the time for you.', id: 'Nyalakan tungku, lalu tekan Mulai. Waktu dihitung otomatis.' }, ill: 'lighting the kiln', fields: [
      { k: 'burn', type: 'timer', label: { en: 'Burn started', id: 'Mulai bakar' } }] },
    { title: { en: 'Photos & videos of the fire', id: 'Foto & video api' }, ins: { en: 'Stand 2 steps back so the whole kiln fits.', id: 'Mundur 2 langkah agar seluruh tungku terlihat.' }, ill: 'kiln with flames', fields: [
      { k: 'firePh', type: 'media', kind: 'photo', need: 3, label: { en: 'Firing photos', id: 'Foto api' }, tip: { en: 'Whole kiln and flames in view', id: 'Seluruh tungku dan api terlihat' } },
      { k: 'fireVid', type: 'media', kind: 'video', need: 3, label: { en: 'Firing videos', id: 'Video api' }, tip: { en: '5 seconds, hold the phone still', id: '5 detik, pegang HP dengan tenang' } }] },
    { title: { en: 'Check the temperature', id: 'Cek suhu' }, ins: { en: 'Point the thermometer at the fire and type the number.', id: 'Arahkan termometer ke api, lalu ketik angkanya.' }, ill: 'thermometer reading', fields: [
      { k: 'temp', type: 'number', label: { en: 'Temperature', id: 'Suhu' }, unit: '°C', hint: { en: 'Usually 500 – 700 °C', id: 'Biasanya 500 – 700 °C' } }] },
    { title: { en: 'Quench the biochar', id: 'Padamkan biochar' }, ins: { en: 'One photo just before the water, one right after.', id: 'Satu foto sebelum disiram, satu sesudahnya.' }, ill: 'water quenching the kiln', fields: [
      { k: 'preq', type: 'media', kind: 'photo', need: 1, label: { en: 'Before quench', id: 'Sebelum padam' }, tip: { en: 'Glowing biochar, top view', id: 'Bara biochar, dari atas' } },
      { k: 'quench', type: 'media', kind: 'photo', need: 1, label: { en: 'After quench', id: 'Sesudah padam' }, tip: { en: 'Wet black biochar, no flames', id: 'Biochar hitam basah, tanpa api' } }] },
    { title: { en: 'End the burn', id: 'Selesaikan pembakaran' }, ins: { en: 'Fill the measuring bucket and type how many litres you got.', id: 'Isi ember ukur, lalu ketik berapa liter hasilnya.' }, ill: 'biochar in measuring bucket', done: { en: 'End burn', id: 'Selesai bakar' }, fields: [
      { k: 'litres', type: 'number', label: { en: 'Biochar made', id: 'Biochar dihasilkan' }, unit: 'L' }] },
  ] },
  { n: 3, icon: 'cooking-pot', name: { en: 'Mix & pack', id: 'Campur & kemas' }, steps: [
    { title: { en: 'Mix the biochar', id: 'Campur biochar' }, ins: { en: 'Choose the mix and how much biochar you used.', id: 'Pilih campuran dan berapa biochar yang dipakai.' }, ill: 'mixing biochar with compost', fields: [
      { k: 'mixType', type: 'choice', label: { en: 'Mix', id: 'Campuran' }, opts: [
        { v: 'Biochar-Compost 1:1', icon: 'cooking-pot' },
        { v: 'Biochar only', label: { en: 'Biochar only', id: 'Biochar saja' }, icon: 'circle' }] },
      { k: 'mixL', type: 'number', label: { en: 'Biochar used', id: 'Biochar dipakai' }, unit: 'L', hint: 'avail' }] },
    { title: { en: 'Photos of the mixing', id: 'Foto pencampuran' }, ins: { en: 'Show the biochar and compost being mixed.', id: 'Tampilkan biochar dan kompos saat dicampur.' }, ill: 'mixed pile on tarp', fields: [
      { k: 'mixPh', type: 'media', kind: 'photo', need: 2, label: { en: 'Mixing photos', id: 'Foto campuran' }, tip: { en: 'Close enough to see the texture', id: 'Cukup dekat, tekstur terlihat' } }] },
    { title: { en: 'Pack into bags', id: 'Masukkan ke karung' }, ins: { en: 'Choose the bag, count the bags, take one photo.', id: 'Pilih karung, hitung jumlahnya, ambil satu foto.' }, ill: 'filled sacks in a row', fields: [
      { k: 'bag', type: 'choice', from: 'bags', addKey: 'bags', label: { en: 'Bag', id: 'Karung' }, opts: [
        { v: 'Karung standard 40 kg', label: { en: 'Standard sack · 40 kg', id: 'Karung standar · 40 kg' }, icon: 'shopping-bag' },
        { v: 'Open', label: { en: 'No bag (loose)', id: 'Tanpa karung (curah)' }, icon: 'mountain' }] },
      { k: 'bags', type: 'number', label: { en: 'Number of bags', id: 'Jumlah karung' }, unit: { en: 'bags', id: 'karung' } },
      { k: 'packPh', type: 'media', kind: 'photo', need: 1, label: { en: 'Packing photo', id: 'Foto kemasan' }, tip: { en: 'All bags in one photo', id: 'Semua karung dalam satu foto' } }] },
  ] },
  { n: 4, icon: 'sprout', name: { en: 'Give & apply', id: 'Bagikan & tebar' }, steps: [
    { title: { en: 'Who gets the biochar?', id: 'Siapa penerima biochar?' }, ins: { en: 'Pick a farmer or a buyer.', id: 'Pilih petani atau pembeli.' }, ill: 'handing sack to farmer', fields: [
      { k: 'to', type: 'choice', from: 'to', addKey: 'farmers', label: { en: 'Receiver', id: 'Penerima' }, opts: [
        { v: 'Pak Fitra KP Hidup Basamo', sub: { en: 'Farmer', id: 'Petani' }, icon: 'user-round' },
        { v: 'Pasaman Barat Farms', sub: { en: 'Farmer group', id: 'Kelompok tani' }, icon: 'users' },
        { v: 'PT Hijau Karbon (sample)', sub: { en: 'Buyer', id: 'Pembeli' }, icon: 'building-2' }] }] },
    { title: { en: 'How many bags?', id: 'Berapa karung?' }, ins: { en: 'Count the bags you hand over.', id: 'Hitung karung yang diserahkan.' }, ill: 'counting sacks', fields: [
      { k: 'giveBags', type: 'number', label: { en: 'Bags given', id: 'Karung diberikan' }, unit: { en: 'bags', id: 'karung' }, hint: 'bags' }] },
    { title: { en: 'Put it on the field', id: 'Tebar di lahan' }, ins: { en: 'Take photos while spreading it, then save the location.', id: 'Foto saat menebar, lalu simpan lokasi.' }, ill: 'spreading biochar on soil', fields: [
      { k: 'applyPh', type: 'media', kind: 'photo', need: 2, label: { en: 'Field photos', id: 'Foto lahan' }, tip: { en: 'Biochar on the soil, field in view', id: 'Biochar di tanah, lahan terlihat' } },
      { k: 'loc', type: 'loc', label: { en: 'Location', id: 'Lokasi' } }] },
  ] },
];
export const SETUP: SetupCategoryDef[] = [
  { key: 'kilns', icon: 'flame-kindling', name: { en: 'Kilns', id: 'Tungku' }, items: ['Masri Malay 5', 'Masri Malay 6', 'Masri Malay 7'] },
  { key: 'sources', icon: 'warehouse', name: { en: 'Biomass sources', id: 'Sumber biomassa' }, items: ['Pak Masri Malay', 'Pasaman Barat Farms'] },
  { key: 'farmers', icon: 'users', name: { en: 'Farmers', id: 'Petani' }, items: ['Pak Fitra KP Hidup Basamo · 813-6394-5159'] },
  { key: 'vehicles', icon: 'truck', name: { en: 'Vehicles', id: 'Kendaraan' }, items: ['Pickup · BA 8841 KT (sample)'] },
  { key: 'bioref', icon: 'book-open', name: { en: 'Biomass reference', id: 'Referensi biomassa' }, items: ['Corn Cob', 'Wood waste', 'Patchouli waste'] },
  { key: 'measure', icon: 'cylinder', name: { en: 'Measuring containers', id: 'Wadah ukur' }, items: ['Bucket · 20 L', 'Drum · 200 L'] },
  { key: 'sample', icon: 'test-tube', name: { en: 'Sampling containers', id: 'Wadah sampel' }, items: ['Jar · 1 L'] },
  { key: 'bags', icon: 'shopping-bag', name: { en: 'Packaging bags', id: 'Karung kemasan' }, items: ['Karung standard · 40 kg'] },
  { key: 'crops', icon: 'sprout', name: { en: 'Preferred crops', id: 'Tanaman pilihan' }, items: ['Corn', 'Rice', 'Chili'] },
  { key: 'buyers', icon: 'building-2', name: { en: 'Buyers', id: 'Pembeli' }, items: ['PT Hijau Karbon (sample)'] },
];
const F = (k: string, en: string, id: string, icon: IconName, type: SetupFormFieldDef['type'] = 'text', unit = '', req = false): SetupFormFieldDef => ({ k, label: { en, id }, icon, type, unit, req });
export const SETUP_FORMS: Record<string, SetupFormFieldDef[]> = {
  kilns: [F('name', 'Kiln name', 'Nama tungku', 'flame-kindling'), F('cap', 'Capacity', 'Kapasitas', 'cylinder', 'number', 'L')],
  sources: [F('name', 'Source name', 'Nama sumber', 'warehouse'), F('addr', 'Village / address', 'Desa / alamat', 'map-pin')],
  farmers: [F('name', 'Farmer name', 'Nama petani', 'user-round'), F('phone', 'Phone number', 'Nomor HP', 'phone', 'tel', '', true)],
  vehicles: [F('name', 'Vehicle type', 'Jenis kendaraan', 'truck'), F('plate', 'Plate number', 'Nomor polisi', 'hash', 'text', '', true)],
  bioref: [F('name', 'Biomass name', 'Nama biomassa', 'wheat')],
  measure: [F('name', 'Container name', 'Nama wadah', 'cylinder'), F('vol', 'Volume', 'Volume', 'ruler', 'number', 'L', true)],
  sample: [F('name', 'Container name', 'Nama wadah', 'test-tube'), F('vol', 'Volume', 'Volume', 'ruler', 'number', 'L', true)],
  bags: [F('name', 'Bag name', 'Nama karung', 'shopping-bag'), F('cap', 'Capacity', 'Kapasitas', 'weight', 'number', 'kg', true)],
  crops: [F('name', 'Crop name', 'Nama tanaman', 'sprout')],
  buyers: [F('name', 'Company name', 'Nama perusahaan', 'building-2'), F('phone', 'Contact phone', 'Telepon kontak', 'phone', 'tel')],
};
export const REJECT_REASONS: RejectReason[] = [
  { k: 'quench', en: 'Quench photo is blurry', id: 'Foto sesudah padam buram', step: 5, clear: 'quench' },
  { k: 'fire', en: 'Firing photos are not clear', id: 'Foto api kurang jelas', step: 3, clear: 'firePh' },
  { k: 'video', en: 'Firing videos are too short', id: 'Video api terlalu pendek', step: 3, clear: 'fireVid' },
  { k: 'moist', en: 'Moisture photos do not match the numbers', id: 'Foto kelembapan tidak sesuai angka', step: 1, clear: 'moist' },
  { k: 'qty', en: 'Biochar amount looks wrong', id: 'Jumlah biochar tampak salah', step: 6, clear: 'litres' },
];
export const TREND: number[] = [1.2, .8, 1.6, 0, 2.1, 1.4, .9, 1.8, 2.4, 0, 1.1, 1.7, 2.0, 1.3, .6, 1.9, 2.2, 0, 1.5, 1.0, 2.3, 1.6, .7, 1.8, 2.1, 1.2, 0, 1.6, 1.55, .8];
