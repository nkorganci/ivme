/** Alt çubuğun üstündeki ince tek satırlık bilgi şeridi: tone = ok | bad | info | warn */
export default function Strip({ tone = 'info', children }) {
  return (
    <div className={`qresult ${tone}`} role={tone === 'bad' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
