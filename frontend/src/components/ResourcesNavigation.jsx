export const RESOURCE_HOME='/konular-ve-kaynaklar';
export const CURRICULUM_HOME='/dersler-ve-konular';
export const isResourcePath=path=>[CURRICULUM_HOME,RESOURCE_HOME,'/kaynak-kutuphanesi','/konu-anlatimlari','/kaynakli-ders-notlari']
  .some(prefix=>path===prefix || path.startsWith(prefix+'/'));
