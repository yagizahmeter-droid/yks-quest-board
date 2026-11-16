(() => {
 'use strict';
 const rowKeys=new WeakMap();const rowKey=q=>{if(!rowKeys.has(q))rowKeys.set(q,crypto.randomUUID());return rowKeys.get(q);};
 const esc=value=>window.DersBoard.escape(String(value??''));
    const options = (values, selected, placeholder) => `<option value="">${placeholder}</option>${values.map(v => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v)}</option>`).join('')}`;
 function taskMarkup(draft){
    return draft.map((q, i) => {
      // `category` is the persisted lesson; topic_category is only catalog navigation.
      const catalog = window.DersCurriculum;
      const group = q.topic_category || catalog.categoryFor(q.exam_type, q.category, q.title);
      const topics = catalog.topics(q.exam_type, q.category, group);
      const legacy = q.title && !q.topic_scope && !topics.includes(q.title);
      if (!legacy && q.title && !q.topic_scope) { q.topic_scope = 'topic'; q.topic_name = q.title; q.topic_category = group; }
      const selected = legacy ? '__legacy' : q.topic_scope === 'category' ? '__category' : q.topic_name;
      if (!legacy) q.title = catalog.taskTitle(group, q.topic_name, q.topic_scope);
      return `<fieldset class="teacher-quest-draft" data-index="${i}" data-class-key="task:${rowKey(q)}"><legend>Görev ${i+1}</legend><div class="builder-grid">
      <label class="field">Sınav<select class="select" aria-label="Sınav türü" data-key="exam_type">${window.DersCurriculum.exams.map(v => `<option ${v === q.exam_type ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field">Ders<select class="select" aria-label="Ders" data-key="category" data-searchable>${options(window.DersCurriculum.lessons(q.exam_type), q.category, 'Ders seç')}</select></label>
      <label class="field">Kategori<select class="select" aria-label="Konu kategorisi" data-key="topic_category" data-searchable ${!q.category ? 'disabled' : ''}>${options(catalog.categories(q.exam_type, q.category), group, 'Kategori seç')}</select></label>
      <label class="field">Alt Konu<select class="select" aria-label="Konu" data-key="topic" data-searchable ${!group && !legacy ? 'disabled' : ''}>${options(topics, selected, 'Alt konu seç')}${group ? `<option value="__category" ${selected === '__category' ? 'selected' : ''}>Genel</option>` : ''}${legacy ? `<option value="__legacy" selected>Eski görev · ${esc(q.title)}</option>` : ''}</select></label>
      <div class="field builder-title"><span>Görev</span><output data-role="derived-title">${esc(q.title) || '—'}</output></div>
      <label class="field builder-detail">Açıklama<textarea class="textarea" data-key="detail" aria-label="Açıklama" maxlength="500">${esc(q.detail)}</textarea></label>
      <label class="field">XP<input class="input" aria-label="XP" type="number" min="5" max="10000" data-key="xp" value="${q.xp}" required></label>
      <label class="field">Tekrar<select class="select" data-key="repeat_kind" aria-label="Tekrar türü">${window.DersQuests.repeatKinds.map(({value:v,label:l}) => `<option value="${v}" ${q.repeat_kind === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${q.repeat_kind === 'weekly' ? `<label class="field">Tekrar Sayısı<input class="input" type="number" min="1" max="100" data-key="repeat_target" aria-label="Tekrar Sayısı" value="${q.repeat_target}" required></label>` : ''}
      ${q.repeat_kind==='daily'&&q.starts_on?`<label class="field">Görevin Başlangıcı<input class="input" type="date" data-key="starts_on" value="${esc(q.starts_on)}" required></label><label class="field">Görevin Bitişi<input class="input" type="date" data-key="ends_on" value="${esc(q.ends_on)}" required></label>`:''}</div>
      <button class="icon-button" type="button" data-action="draft-delete" data-id="${i}" title="Görev Sil" aria-label="Görev ${i+1} sil"><i data-lucide="trash-2"></i></button></fieldset>`;
    }).join('');
 }
 function change(q,field,value){
      if (field === 'exam_type') { q.exam_type = value; q.category = ''; q.topic_category = ''; q.topic_name = ''; q.topic_scope = ''; q.title = ''; }
      else if (field === 'category') { q.category = value; q.topic_category = ''; q.topic_name = ''; q.topic_scope = ''; q.title = ''; }
      else if (field === 'topic_category') { q.topic_category = value; q.topic_name = ''; q.topic_scope = ''; q.title = ''; }
      else if (field === 'topic' && value !== '__legacy') { q.topic_scope = value === '__category' ? 'category' : value ? 'topic' : ''; q.topic_name = value === '__category' ? null : value; q.title = window.DersCurriculum.taskTitle(q.topic_category, q.topic_name, q.topic_scope); }
      else if (field === 'repeat_kind') { q.repeat_kind = value; q.repeat_target = value === 'weekly' ? 5 : 1;delete q.starts_on;delete q.ends_on; }
      else return false;
      return true;
 }
 function fresh(){return {exam_type:'TYT',category:'',topic_category:'',topic_name:'',topic_scope:'',title:'',detail:'',xp:100,repeat_kind:'none',repeat_target:1};}
 function payload(draft,start,end){return draft.map(q=>{const r=window.DersQuests.repeatSettings({kind:q.repeat_kind,target:q.repeat_target,startDate:q.starts_on||start,endDate:q.ends_on||end});return {exam_type:q.exam_type,category:q.category,title:String(q.title||'').trim(),detail:String(q.detail||'').trim(),xp:Number(q.xp),repeat_kind:r.kind,repeat_target:r.target,...(q.topic_scope?{topic_category:q.topic_category,topic_name:q.topic_name,topic_scope:q.topic_scope}:{}),...(r.kind==='daily'?{starts_on:r.startDate,ends_on:r.endDate}:{})};});}
 function validate(body){if(!body.name?.trim()||body.name.trim().length>120)throw Error('1–120 karakterlik bir program adı gir.');if(!/^\d{4}-\d{2}-\d{2}$/.test(body.start)||!/^\d{4}-\d{2}-\d{2}$/.test(body.end)||body.end<body.start)throw Error('Geçerli başlangıç ve bitiş tarihlerini seç.');const quests=payload(body.quests,body.start,body.end);if(!quests.length||quests.length>200||quests.some(q=>!window.DersCurriculum.supports(q.exam_type,q.category)||!q.title||!Number.isInteger(q.xp)||q.xp<5||q.xp>10000))throw Error('Ders, konu, XP ve en az bir geçerli görev gerekli.');if(quests.some(q=>q.repeat_kind==='daily'&&(q.starts_on<body.start||q.ends_on>body.end)))throw Error('Günlük görev tarihleri program aralığında olmalı.');return quests;}
 window.DersProgramComposer={fresh,taskMarkup,change,payload,validate};
})();
