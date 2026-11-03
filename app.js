/* ZIET Mumbai | Fooding & Lodging Feedback */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyUWy-LV0gjeouo05DAV4uAxwlaNojgTa3Qqmb4FR8xPFixI0ndIfwz3FPws_emfYavUA/exec";
const PARTICIPANT_SHEET_ID = "1Uuqoz2KFpTcw9d2HI02fLmFPopTaLnKWwZ9aR-uYCeY";
const PARTICIPANT_CSV_URL = `https://docs.google.com/spreadsheets/d/${PARTICIPANT_SHEET_ID}/export?format=csv`;
const DRIVE_FOLDER_REFERENCE = "https://drive.google.com/drive/folders/16W9tBw5FYz4s4C-plc0oYqyyBQR4Sfx3";

const questions = [
  "How would you rate the overall comfort of your hostel room?",
  "How would you rate the cleanliness of the bedsheets and pillows?",
  "How would you rate the cleanliness of the mattress?",
  "How would you rate the comfort of the mattress?",
  "How would you rate the cleanliness of the toilet pan?",
  "How would you rate the working condition of the washroom taps?",
  "How would you rate the working condition of the bathroom geyser?",
  "How would you rate the cooling performance of the air conditioner?",
  "How would you rate the cleanliness of the water jugs and glasses provided?",
  "How would you rate the cleanliness of the bathroom buckets and mugs?",
  "How would you rate the condition and usability of the mirror?",
  "How would you rate the overall cleanliness and hygiene of the room?",
  "How would you rate the effectiveness of the mosquito repellent provided?"
];
const scale = [{v:1,t:"Poor"},{v:2,t:"Fair"},{v:3,t:"Good"},{v:4,t:"Very Good"},{v:5,t:"Excellent"}];

function renderQuestions(){
  const root=document.getElementById("ratingQuestions");
  root.innerHTML=questions.map((q,i)=>`
    <fieldset class="rating-question">
      <legend><span class="number">${i+1}</span>${q} <span class="req">*</span></legend>
      <div class="rating-options">
        ${scale.map(s=>`<label class="rating-option">
          <input type="radio" name="rating_${i+1}" value="${s.v}" required>
          <span class="rating-circle">${s.v}</span><span class="rating-label">${s.t}</span>
        </label>`).join("")}
      </div>
    </fieldset>`).join("");
}
function parseCSV(text){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c==='"'&&quoted&&n==='"'){cell+='"';i++;}
    else if(c==='"')quoted=!quoted;
    else if(c===','&&!quoted){row.push(cell);cell="";}
    else if((c==="\n"||c==="\r")&&!quoted){
      if(c==="\r"&&n==="\n")i++;
      row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);row=[];cell="";
    }else cell+=c;
  }
  if(cell.length||row.length){row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);}
  return rows;
}
function norm(value){return String(value||"").replace(/\uFEFF/g,"").trim().toLocaleLowerCase().replace(/\s+/g," ");}
function findColumn(headers,names){const wanted=names.map(norm);return headers.findIndex(h=>wanted.includes(norm(h)));}
function getCell(row,index){return index>=0?String(row[index]||"").trim():"";}
function showParticipantStatus(message,type="info"){
  const el=document.getElementById("participantStatus");el.textContent=message;el.className="helper-text "+type;
}
let participants=[];
function fillParticipantDetails(){
  const select=document.getElementById("participantSelect");
  const p=participants[Number(select.value)];
  ["participantName","school","designation","region","email"].forEach(id=>document.getElementById(id).value="");
  if(!p)return;
  document.getElementById("participantName").value=p.name;
  document.getElementById("school").value=p.school;
  document.getElementById("designation").value=p.designation;
  document.getElementById("region").value=p.region;
  document.getElementById("email").value=p.email;
  showParticipantStatus("Participant details loaded. Please enter your hostel room number.");
}
async function loadParticipants(){
  const select=document.getElementById("participantSelect");
  try{
    const response=await fetch(PARTICIPANT_CSV_URL,{cache:"no-store"});
    if(!response.ok)throw new Error("Google Sheets returned HTTP "+response.status);
    const rows=parseCSV(await response.text());
    if(rows.length<2)throw new Error("No participant records were found in the first sheet.");
    const headers=rows[0];
    const cols={
      name:findColumn(headers,["Name of the Participant","प्रतिभागी का नाम"]),
      designation:findColumn(headers,["Designation","पदनाम"]),
      school:findColumn(headers,["School","विद्यालय"]),
      region:findColumn(headers,["Region","आंचल"]),
      email:findColumn(headers,["email","Email Address"])
    };
    if(cols.name<0)throw new Error("Could not find the participant-name column.");
    participants=rows.slice(1).map(row=>({
      name:getCell(row,cols.name),
      designation:getCell(row,cols.designation),
      school:getCell(row,cols.school),
      region:getCell(row,cols.region),
      email:getCell(row,cols.email)
    })).filter(p=>p.name);
    if(!participants.length)throw new Error("The participant list contains no names.");
    select.innerHTML='<option value="">-- Select your name --</option>';
    const foodSelect=document.getElementById("foodParticipantSelect");
    if(foodSelect)foodSelect.innerHTML='<option value="">-- Select your name --</option>';
    participants.forEach((p,i)=>{
      const option=document.createElement("option");option.value=String(i);
      option.textContent=p.name+(p.school?" — "+p.school:"");
      select.appendChild(option);
      if(foodSelect)foodSelect.appendChild(option.cloneNode(true));
    });
    showParticipantStatus(participants.length+" participants loaded. Select your name to auto-fill your details.");
    const foodStatus=document.getElementById("foodParticipantStatus");if(foodStatus)foodStatus.textContent=participants.length+" participants loaded. Select your name to auto-fill your details.";
  }catch(error){
    select.innerHTML='<option value="">Participant list could not be loaded</option>';
    select.disabled=true;
    showParticipantStatus("Unable to load the public participant list: "+error.message+". Please check that the Google Sheet is shared as Anyone with the link – Viewer and that the first tab contains the heading row.", "error");
  }
}
function setupSignaturePad(){
  const canvas=document.getElementById("signaturePad");
  const ctx=canvas.getContext("2d");
  const status=document.getElementById("signatureStatus");
  let drawing=false,hasSignature=false,lastPoint=null;
  ctx.lineWidth=3.2;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#172b4d";
  function point(event){
    const rect=canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
  }
  canvas.addEventListener("pointerdown",event=>{
    event.preventDefault();drawing=true;lastPoint=point(event);canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();ctx.moveTo(lastPoint.x,lastPoint.y);ctx.lineTo(lastPoint.x+0.1,lastPoint.y+0.1);ctx.stroke();
    hasSignature=true;status.textContent="Signature captured";
  });
  canvas.addEventListener("pointermove",event=>{
    if(!drawing)return;event.preventDefault();const p=point(event);
    ctx.beginPath();ctx.moveTo(lastPoint.x,lastPoint.y);ctx.lineTo(p.x,p.y);ctx.stroke();lastPoint=p;
  });
  function stop(){drawing=false;lastPoint=null;}
  canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);canvas.addEventListener("lostpointercapture",stop);
  document.getElementById("clearSignature").addEventListener("click",()=>{
    ctx.clearRect(0,0,canvas.width,canvas.height);hasSignature=false;status.textContent="Signature required";
  });
  return {
    hasSignature:()=>hasSignature,
    dataUrl:()=>hasSignature?canvas.toDataURL("image/png"):""
  };
}
const signaturePad=setupSignaturePad();

function setupPhotoAndLocation(){
  const video=document.getElementById("photoVideo");
  const canvas=document.getElementById("photoCanvas");
  const preview=document.getElementById("photoPreview");
  const start=document.getElementById("startCamera");
  const capture=document.getElementById("capturePhoto");
  const retake=document.getElementById("retakePhoto");
  const photoStatus=document.getElementById("photoStatus");
  const locationStatus=document.getElementById("locationStatus");
  let stream=null,photoDataUrl="",geotag=null;

  start.addEventListener("click",async()=>{
    try{
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("Live camera is not available in this browser. Please use a modern browser over HTTPS.");
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
      video.srcObject=stream;video.hidden=false;preview.hidden=true;
      capture.disabled=false;start.disabled=true;
      photoStatus.textContent="Camera is active. Position your face and select Capture Photo.";
    }catch(error){photoStatus.textContent="Camera unavailable: "+error.message;}
  });
  capture.addEventListener("click",()=>{
    if(!video.videoWidth)return;
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    const ctx=canvas.getContext("2d");
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    photoDataUrl=canvas.toDataURL("image/jpeg",0.78);
    preview.src=photoDataUrl;preview.hidden=false;video.hidden=true;
    if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}
    capture.disabled=true;start.disabled=false;retake.hidden=false;
    photoStatus.textContent="Photograph captured. It will be attached to your feedback.";
  });
  retake.addEventListener("click",()=>{
    photoDataUrl="";preview.removeAttribute("src");preview.hidden=true;retake.hidden=true;
    photoStatus.textContent="Photograph cleared. You may capture another.";
  });
  document.getElementById("getLocation").addEventListener("click",()=>{
    if(!navigator.geolocation){locationStatus.textContent="Geolocation is not supported by this browser.";return;}
    locationStatus.textContent="Waiting for location permission…";
    navigator.geolocation.getCurrentPosition(position=>{
      geotag={latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,capturedAt:new Date().toISOString()};
      locationStatus.textContent="Geotag added (accuracy about "+Math.round(geotag.accuracy)+" metres).";
    },error=>{
      const messages={1:"Location permission was denied.",2:"Your location is unavailable.",3:"Location request timed out."};
      locationStatus.textContent=messages[error.code]||"Could not retrieve location.";
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  });
  return {photo:()=>photoDataUrl,geotag:()=>geotag};
}
const evidence=setupPhotoAndLocation();

function readForm(form){
  const fd=new FormData(form);
  const participant={
    name:String(fd.get("participantName")||"").trim(),
    school:String(fd.get("school")||"").trim(),
    designation:String(fd.get("designation")||"").trim(),
    region:String(fd.get("region")||"").trim(),
    hostelBlock:String(fd.get("hostelBlock")||"").trim(),
    roomNumber:String(fd.get("roomNumber")||"").trim(),
    room:String([fd.get("hostelBlock"),fd.get("roomNumber")].filter(Boolean).join("-")),
    email:String(fd.get("email")||"").trim()
  };
  const ratings={};
  questions.forEach((q,i)=>{ratings[String(i+1)]=Number(fd.get("rating_"+(i+1))||0)});
  return {participant,ratings,suggestions:String(fd.get("suggestions")||"").trim(),signatureDataUrl:signaturePad.dataUrl(),photoDataUrl:evidence.photo(),geotag:evidence.geotag(),submittedAt:new Date().toISOString()};
}
function showStatus(message,type){
  const el=document.getElementById("status");el.textContent=message;el.className="status "+type;
}
async function submitFeedback(event){
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  if(!signaturePad.hasSignature()){
    showStatus("Please draw your signature before submitting the feedback.","error");return;
  }
  const payload=readForm(form);
  if(questions.some((q,i)=>!payload.ratings[String(i+1)])){
    showStatus("Please provide a rating for all 13 statements.","error");return;
  }
  const btn=document.getElementById("submitBtn");
  if(!APPS_SCRIPT_URL){
    showStatus("The participant list is connected, but PDF saving is not connected yet. The administrator must add the Apps Script Web App URL before participants submit.","warning");
    return;
  }
  btn.disabled=true;btn.textContent="Submitting…";
  try{
    const response=await fetch(APPS_SCRIPT_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload),redirect:"follow"});
    const result=await response.json();
    if(!response.ok||!result.success)throw new Error(result.message||"Submission could not be completed.");
    showStatus(result.message||"Thank you. Your feedback has been submitted and your PDF is ready.","success");
    if(result.pdfUrl){const a=document.createElement("a");a.href=result.pdfUrl;a.target="_blank";a.rel="noopener";a.className="download-link";a.textContent="Open / Download your feedback PDF";document.getElementById("status").append(document.createElement("br"),a);}
    form.reset();document.getElementById("participantName").value="";document.getElementById("school").value="";document.getElementById("designation").value="";document.getElementById("region").value="";document.getElementById("email").value="";btn.textContent="Submitted";
  }catch(error){showStatus("Submission failed: "+error.message,"error");btn.disabled=false;btn.textContent="Submit Feedback";}
}
renderQuestions();
document.getElementById("participantSelect").addEventListener("change",fillParticipantDetails);
document.getElementById("feedbackForm").addEventListener("submit",submitFeedback);
loadParticipants();


// Dashboard navigation: switch between the landing dashboard and feedback sections.
function showDashboardView(view){
  const ids={dashboard:"dashboardView",fooding:"foodingView",lodging:"lodgingView"};
  Object.entries(ids).forEach(([key,id])=>{
    const section=document.getElementById(id);
    if(section)section.hidden=key!==view;
  });
  document.querySelectorAll(".dashboard-tab").forEach(tab=>{
    const active=tab.dataset.view===view;
    tab.classList.toggle("active",active);
    tab.setAttribute("aria-current",active?"page":"false");
  });
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-view]").forEach(control=>{
  control.addEventListener("click",()=>showDashboardView(control.dataset.view));
});
showDashboardView("dashboard");


function fillFoodParticipantDetails(){
 const p=participants[Number(document.getElementById("foodParticipantSelect").value)];
 const values={foodParticipantName:p?p.name:"",foodSchool:p?p.school:"",foodDesignation:p?p.designation:"",foodRegion:p?p.region:"",foodEmail:p?p.email:""};
 Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.value=value;});
 if(p)document.getElementById("foodParticipantStatus").textContent="Participant details loaded automatically.";
}
document.getElementById("foodParticipantSelect").addEventListener("change",fillFoodParticipantDetails);

const foodQuestions = [
"Overall quality of the food served",
"Taste and flavour of the meals",
"Variety of dishes offered",
"Freshness and serving temperature of the food",
"Hygiene and cleanliness of the dining area",
"Cleanliness of crockery and cutlery",
"Serving arrangements and portion sizes",
"Punctuality and overall dining service"
];
function renderFoodQuestions(){
 const root=document.getElementById("foodRatingQuestions");
 if(!root)return;
 root.innerHTML=foodQuestions.map((q,i)=>{
  const opts=scale.map(v=>'<label class="rating-option"><input type="radio" name="food_rating_'+(i+1)+'" value="'+v.v+'" required><span class="rating-circle">'+v.v+'</span><span class="rating-label">'+v.t+'</span></label>').join("");
  return '<fieldset class="rating-question"><legend><span class="number">'+(i+1)+'</span>How would you rate the '+q.toLowerCase()+'? <span class="req">*</span></legend><div class="rating-options">'+opts+'</div></fieldset>';
 }).join("");
}
function showFoodStatus(message,type){
 const el=document.getElementById("foodStatus");el.textContent=message;el.className="status "+type;
}
async function submitFoodingFeedback(event){
 event.preventDefault();
 const form=event.currentTarget;if(!form.reportValidity())return;
 const fd=new FormData(form);
 const participant={name:String(fd.get("participantName")||"").trim(),school:String(fd.get("school")||"").trim(),designation:String(fd.get("designation")||"").trim(),region:String(fd.get("region")||"").trim(),email:String(fd.get("email")||"").trim()};
 const ratings={};foodQuestions.forEach((q,i)=>ratings[String(i+1)]=Number(fd.get("food_rating_"+(i+1))||0));
 if(foodQuestions.some((q,i)=>!ratings[String(i+1)])){showFoodStatus("Please rate all eight Fooding statements.","error");return;}
 if(!APPS_SCRIPT_URL){showFoodStatus("PDF storage is not configured.","warning");return;}
 const btn=document.getElementById("foodSubmitBtn");btn.disabled=true;btn.textContent="Submitting…";
 const payload={feedbackType:"fooding",participant,ratings,suggestions:String(fd.get("suggestions")||"").trim(),submittedAt:new Date().toISOString()};
 try{
  const response=await fetch(APPS_SCRIPT_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload),redirect:"follow"});
  const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||"Fooding submission could not be completed.");
  showFoodStatus(result.message||"Fooding feedback submitted. Your PDF record is ready.","success");
  if(result.pdfUrl){const a=document.createElement("a");a.href=result.pdfUrl;a.target="_blank";a.rel="noopener";a.className="download-link";a.textContent="Open / Download Fooding Feedback PDF";document.getElementById("foodStatus").append(document.createElement("br"),a);}
  form.reset();fillFoodParticipantDetails();btn.textContent="Submitted";
 }catch(error){showFoodStatus("Submission failed: "+error.message,"error");btn.disabled=false;btn.textContent="Submit Fooding Feedback";}
}
renderFoodQuestions();
document.getElementById("foodingForm").addEventListener("submit",submitFoodingFeedback);
