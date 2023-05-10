import { __library_name__, translations } from './index';

const ka = {
  one: 'ერთი',
  hello: (name: string) => `გამარჯობა ${name}`,
  contact: {
    email: "ელ. ფოსტა",
    address: {
      main: "მთავარი მისამართი",
      secondary: "დამატებითი მისამართი",
    }
  }
} as const

const en = translations({
  one: 'one',
  hello: (name: string) => `Hello ${name}`,
  contact: {
    email: "E-mail",
    address: {
      main: "Main address",
      secondary: "Secondary address",
    }
  }
})

const dictionary = {
  en,
  ka,
}

const createTranslator = __library_name__(dictionary, "ka")

const transEn = createTranslator("en")
const transKa = createTranslator("ka")

const a = transEn("hello", 'john')
const b = transKa("contact.address.secondary")
