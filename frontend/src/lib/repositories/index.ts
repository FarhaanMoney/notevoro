/**
 * Repository Index
 * 
 * Central export point for all repository abstractions.
 * These provide clean interfaces between the UI and the vault storage layer.
 */

export { NotesRepository, notesRepository } from "./NotesRepository";
export { TasksRepository, tasksRepository } from "./TasksRepository";
export { SpacesRepository, spacesRepository } from "./SpacesRepository";
export { CalendarRepository, calendarRepository } from "./CalendarRepository";
export { VoroRepository, voroRepository } from "./VoroRepository";
