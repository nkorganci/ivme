import { videoTeachers } from '../curriculumVideos.js';
import ResourceContext from './ResourceContext.jsx';
import {useState} from 'react';
import {locatedResourceUrl,locatorLabel} from '../resourceMetadata.js';

function LessonVideo({video,teacher,lessonKey}) {
  const [resource,setResource]=useState(null);
  const assignment=resource?.labels.assignments.find(a=>a.categoryId===`subtopic:${lessonKey}`);
  const locator=assignment?.locators?.find(l=>l.type==='VIDEO');
  const url=locatedResourceUrl(resource?.url || video.url,locator);
  return <div className="curriculum-video">
    {lessonKey && <ResourceContext itemKey={`video:${lessonKey}:${video.id}`} onLoaded={setResource}/>}
    <a className="curriculum-video-qr" href={video.url} target="_blank" rel="noopener noreferrer" aria-label={`${teacher} · ${video.title} tam video bağlantısı`}>
      <img src={video.qr} width="96" height="96" loading="lazy" decoding="async" alt={`${teacher} · ${video.title} tam video bağlantısının QR kodu`}/>
    </a>
    <a className="curriculum-video-link" href={url} target="_blank" rel="noopener noreferrer" title={video.title}>{resource?.displayTitle || video.title}<span>Videoyu izle ↗</span></a>
    {locator && <small>{assignment.locatorStatus==='VERIFIED'?'Doğrulanmış aralık':'Tahmini aralık'} · {locatorLabel(locator)}</small>}
  </div>;
}

export default function LessonVideos({ videos, teacher = 'all',lessonKey }) {
  return <div className="curriculum-video-list">
    {videoTeachers.filter((item) => teacher === 'all' || teacher === item.id).map((item) => {
      const entries = videos.filter((video) => video.teacher === item.id);
      return entries.length > 0 && <section key={item.id} className="curriculum-video-teacher" aria-label={item.name}>
        <strong className="curriculum-teacher-name">{item.name}</strong>
        {entries.map(video=><LessonVideo key={video.id} video={video} teacher={item.name} lessonKey={lessonKey}/>)}
      </section>;
    })}
  </div>;
}
