import {useState} from 'react';
import {BookOpen, Search} from 'lucide-react';
import {terms} from './content';
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function Glossary(){
 const [query,setQuery]=useState(''),[category,setCategory]=useState('Todas');
 const filtered=terms.filter(t=>(category==='Todas'||t.category===category)&&normalize(t.term+' '+t.definition+' '+t.example).includes(normalize(query)));
 return <section className="panel glossary" id="glossary" aria-labelledby="glossary-title"><div className="section-title"><div><h3 id="glossary-title">Glosario neuronal</h3><p>Definiciones, ejemplos y vocabulario de las tres familias.</p></div><BookOpen size={19}/></div><div className="glossary-filters"><label className="search"><Search size={16}/><input aria-label="Buscar en el glosario" placeholder="Busca un término o concepto…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Categoría<select aria-label="Categoría del glosario" value={category} onChange={e=>setCategory(e.target.value)}>{['Todas','Bases','Aprendizaje','RNN','CNN','GAN'].map(c=><option key={c}>{c}</option>)}</select></label></div><p className="glossary-count" role="status">{filtered.length} de {terms.length} términos</p><div className="glossary-grid">{filtered.map(t=><details key={t.term}><summary><span>{t.term}</span><em>{t.category}</em></summary><p>{t.definition}</p><div><strong>Ejemplo</strong><p>{t.example}</p></div></details>)}</div>{!filtered.length&&<div className="empty"><p>No hay términos que coincidan con tu búsqueda.</p><button className="text-btn" onClick={()=>{setQuery('');setCategory('Todas')}}>Limpiar búsqueda</button></div>}</section>
}
