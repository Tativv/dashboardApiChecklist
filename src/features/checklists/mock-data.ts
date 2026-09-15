export type Role = 'Admin' | 'Supervisor' | 'Operator' | 'Manager';
export type ChecklistStatus = 'Pendiente' | 'En progreso' | 'Finalizado' | 'Aprobado' | 'Vencido';
export type Checklist = { id:string; template:string; asset:string; area:string; assigned:string; status:ChecklistStatus; started?:string; due:string; progress:number };
export const initialChecklists: Checklist[] = [
  {id:'CL-2048',template:'Inspección de habitación',asset:'Habitación 412',area:'Habitaciones',assigned:'Lucía Moreno',status:'En progreso',started:'08:22',due:'10:00',progress:68},
  {id:'CL-2047',template:'Apertura de restaurante',asset:'Restaurante Aurora',area:'Alimentos y bebidas',assigned:'Carlos Ruiz',status:'Finalizado',started:'07:05',due:'08:30',progress:100},
  {id:'CL-2046',template:'Control de piscina',asset:'Piscina principal',area:'Piscina',assigned:'Diego Martín',status:'Pendiente',due:'11:00',progress:0},
  {id:'CL-2045',template:'Ronda de mantenimiento',asset:'Torre Norte',area:'Mantenimiento',assigned:'Sofía García',status:'Vencido',due:'09:00',progress:40},
  {id:'CL-2044',template:'Inspección de lobby',asset:'Lobby principal',area:'Recepción',assigned:'Ana Costa',status:'Aprobado',started:'06:45',due:'08:00',progress:100}
];
export const areas=[['Habitaciones','48 activos','Limpieza, inspección y amenities'],['Recepción','6 activos','Lobby, recepción y conserjería'],['Alimentos y bebidas','12 activos','Restaurante, bar y cocina'],['Piscina','4 activos','Piscinas y zonas de descanso'],['Mantenimiento','18 activos','Instalaciones y equipos']];
export const assets=[['Habitación 412','Habitación','Habitaciones','Activo'],['Restaurante Aurora','Restaurante','Alimentos y bebidas','Activo'],['Piscina principal','Piscina','Piscina','Activo'],['Lobby principal','Zona común','Recepción','Activo'],['Aire acondicionado T-N','Equipo','Mantenimiento','En mantenimiento']];
export const templates=[['Inspección de habitación','Habitaciones','Diaria','12 tareas','15 min'],['Apertura de restaurante','Alimentos y bebidas','Diaria','18 tareas','25 min'],['Control de piscina','Piscina','Cada 4 horas','10 tareas','10 min'],['Ronda de mantenimiento','Mantenimiento','Diaria','14 tareas','20 min']];
