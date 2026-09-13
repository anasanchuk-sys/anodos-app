export function consultationMarkup(){return `<section class="consultation-card" aria-labelledby="consultation-title">
 <span class="eyebrow">НАСТУПНИЙ КРОК</span><h3 id="consultation-title">Обговоріть свій договір з експертом</h3>
 <p>Залиште номер телефону, щоб експерт BRITMARK міг зв’язатися з вами та пояснити, які зміни варто погодити зі страховиком.</p>
 <button class="consultation-cta" id="consultation-open" type="button" aria-expanded="false" aria-controls="consultation-form">Отримати безкоштовну консультацію експерта <span aria-hidden="true">↗</span></button>
 <form id="consultation-form" class="consultation-form" hidden>
  <label for="consultation-phone">Ваш номер телефону</label>
  <input id="consultation-phone" name="tel" type="tel" autocomplete="tel" inputmode="tel" maxlength="48" placeholder="+380 50 123 45 67" required aria-describedby="consultation-privacy consultation-error">
  <p class="consultation-privacy" id="consultation-privacy">Натискаючи кнопку, ви погоджуєтеся передати номер BRITMARK для зв’язку щодо цього договору.</p>
  <p class="consultation-error" id="consultation-error" role="alert" hidden></p>
  <button class="consultation-cta" id="consultation-send" type="submit">Отримати безкоштовну консультацію експерта <span aria-hidden="true">↗</span></button>
 </form>
 <div class="consultation-success" id="consultation-success" role="status" hidden><strong>Дякуємо! Запит на консультацію отримано.</strong><p id="consultation-confirmation"></p><button class="consultation-edit" id="consultation-edit" type="button">Змінити номер телефону</button></div>
</section>`;}

export function mountConsultation(root,request){
 const get=id=>root.querySelector('#'+id),open=get('consultation-open'),form=get('consultation-form'),phone=get('consultation-phone'),send=get('consultation-send'),error=get('consultation-error'),success=get('consultation-success');
 let pending=false,interacted=false;
 const reveal=()=>{interacted=true;success.hidden=true;open.hidden=true;open.setAttribute('aria-expanded','true');form.hidden=false;phone.focus();};
 const confirm=data=>{form.hidden=true;open.hidden=true;open.setAttribute('aria-expanded','false');success.hidden=false;get('consultation-confirmation').textContent='Номер '+data.maskedPhone+' збережено для зв’язку щодо вашого договору.';phone.value='';};
 open.addEventListener('click',reveal);get('consultation-edit').addEventListener('click',reveal);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(pending)return;interacted=true;pending=true;send.disabled=true;phone.disabled=true;error.hidden=true;const caption=send.innerHTML;send.textContent='Надсилаємо запит…';
  try{const data=await request({method:'POST',json:{phone:phone.value,consent:'expert-consultation-phone-v1'}});if(!data.requested)throw new Error('Не вдалося підтвердити збереження номера. Спробуйте ще раз.');confirm(data);}
  catch(e){error.textContent=e.message||'Не вдалося зберегти номер. Спробуйте ще раз.';error.hidden=false;}
  finally{pending=false;send.disabled=false;phone.disabled=false;send.innerHTML=caption;}
 });
 // Restore success on the private result link. A late response must not
 // overwrite a phone number the visitor has already started entering.
 request({}).then(data=>{if(data.requested&&!interacted)confirm(data);}).catch(()=>{});
}
