import { Moon,Sun } from 'lucide-react';
import { useEffect,useState } from 'react';
export function ThemeToggle(){
 const [dark,setDark]=useState(()=>localStorage.getItem('nl-theme')==='dark');
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('nl-theme',dark?'dark':'light')},[dark]);
 return <button className="theme-toggle" aria-label={dark?'Activar modo claro':'Activar modo oscuro'} title={dark?'Activar modo claro':'Activar modo oscuro'} onClick={()=>setDark(!dark)}>{dark?<Sun size={17}/>:<Moon size={17}/>}<span>{dark?'Modo claro':'Modo oscuro'}</span></button>
}
