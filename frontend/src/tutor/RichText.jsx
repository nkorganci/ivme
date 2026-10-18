import { parseRich } from './richText.js';

/** Üs ve alt simgeleri biçimlendirerek metni yazar; HTML yorumlanmaz. */
export default function RichText({ text, as: Tag = 'span', className }) {
  return <Tag className={className}>{parseRich(text).map((part, index) => part.type === 'sup'
    ? <sup key={index}>{part.value}</sup>
    : part.type === 'sub' ? <sub key={index}>{part.value}</sub> : <span key={index}>{part.value}</span>)}</Tag>;
}
