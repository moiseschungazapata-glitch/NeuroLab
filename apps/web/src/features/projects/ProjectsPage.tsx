import { Search,FolderKanban,SlidersHorizontal } from 'lucide-react';
import {useState} from 'react';
import type { LaboratoryContext } from '../../hooks/useLaboratory';
import { ProjectCard } from '../projects/ProjectCard';
import {ProjectDetail} from './ProjectDetail';
import {families} from '../architectures/model';
import {statuses} from './model';

export function ProjectsPage({context}:{context:LaboratoryContext}){
const {projects,search,setSearch,projectDetail,setProjectDetail}=context;
const [family,setFamily]=useState('Todas'),[status,setStatus]=useState('Todos'),[tag,setTag]=useState('Todas'),[sort,setSort]=useState('name');
if(projectDetail!==null)return <ProjectDetail key={projectDetail} context={context}/>;
const tags=[...new Set(projects.flatMap(p=>p.tags??[]))].sort();
const filtered=projects.filter(p=>[p.name,p.description,...p.tags??[]].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())&&(family==='Todas'||p.family===family)&&(status==='Todos'||p.status===status)&&(tag==='Todas'||p.tags?.includes(tag))).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'es'):sort==='updated'?(b.updatedAt??'').localeCompare(a.updatedAt??''):(b.createdAt??'').localeCompare(a.createdAt??''));
const activeFilters=family!=='Todas'||status!=='Todos'||tag!=='Todas'||!!search;
return <><div className="project-summary"><FolderKanban size={21}/><div><strong>{projects.length} proyectos en tu espacio</strong><span>{projects.filter(p=>p.status==='En desarrollo').length} en desarrollo · {projects.filter(p=>p.status==='En revisión').length} en revisión</span></div><span className="badge green">Guardado local</span></div><section className="panel project-filters" aria-label="Filtros de proyectos"><label className="search"><Search size={17}/><input aria-label="Buscar proyectos" placeholder="Buscar por nombre, descripción o etiqueta…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Familia<select aria-label="Familia" value={family} onChange={e=>setFamily(e.target.value)}><option>Todas</option>{families.map(f=><option key={f}>{f}</option>)}</select></label><label>Estado<select aria-label="Estado" value={status} onChange={e=>setStatus(e.target.value)}><option>Todos</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><label>Etiqueta<select aria-label="Etiqueta" value={tag} onChange={e=>setTag(e.target.value)}><option>Todas</option>{tags.map(t=><option key={t}>{t}</option>)}</select></label><label>Ordenar<select aria-label="Ordenar" value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Nombre A–Z</option><option value="created">Creación reciente</option><option value="updated">Actualización reciente</option></select></label></section><div className="project-results"><span role="status">{filtered.length} de {projects.length} proyectos</span>{activeFilters&&<button className="text-btn" onClick={()=>{setFamily('Todas');setStatus('Todos');setTag('Todas');setSearch('')}}><SlidersHorizontal size={13}/> Limpiar filtros</button>}</div><div className="project-grid">{filtered.map((p,i)=><ProjectCard key={p.id} p={p} i={i} onClick={()=>{context.setProject(p.id);context.setFamily(p.family as typeof context.family);setProjectDetail(p.id)}}/>)}</div>{!filtered.length&&<section className="panel project-empty"><FolderKanban size={30}/><h3>{projects.length?'No hay coincidencias':'Tu próximo proyecto empieza aquí'}</h3><p>{projects.length?'Prueba con otros filtros o términos de búsqueda.':'Crea un proyecto para organizar tus experimentos.'}</p></section>}</>;
}

