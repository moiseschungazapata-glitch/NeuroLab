import { ArrowRight,FolderKanban,MoreHorizontal } from 'lucide-react';
import type { Project } from '../../types';
export function ProjectCard({p,i,onClick}:{p:Project;i:number;onClick:()=>void}){return <button className="project-card" onClick={onClick}><div className="project-card-top"><span className={'project-icon tone-'+i%3}><FolderKanban size={21}/></span><MoreHorizontal size={18}/></div><span className="project-family">{p.family}</span><h3>{p.name}</h3><p>{p.description}</p><div className="project-tags">{p.tags?.slice(0,3).map(t=><span key={t}>{t}</span>)}</div><div className="project-card-bottom"><span><i/>{p.status}</span><span>Abrir <ArrowRight size={14}/></span></div></button>}

