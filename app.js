/* ZIET Mumbai | Fooding & Lodging Feedback */
const APPS_SCRIPT_URL = ""; // Add the deployed PDF-saving Apps Script URL here.
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
    participants.forEach((p,i)=>{
      const option=document.createElement("option");option.value=String(i);
      option.textContent=p.name+(p.school?" — "+p.school:"");
      select.appendChild(option);
    });
    showParticipantStatus(participants.length+" participants loaded. Select your name to auto-fill your details.");
  }catch(error){
    select.innerHTML='<option value="">Participant list could not be loaded</option>';
    select.disabled=true;
    showParticipantStatus("Unable to load the public participant list: "+error.message+". Please check that the Google Sheet is shared as Anyone with the link – Viewer and that the first tab contains the heading row.", "error");
  }
}
function readForm(form){
  const fd=new FormData(form);
  const participant={
    name:String(fd.get("participantName")||"").trim(),
    school:String(fd.get("school")||"").trim(),
    designation:String(fd.get("designation")||"").trim(),
    region:String(fd.get("region")||"").trim(),
    roomNumber:String(fd.get("roomNumber")||"").trim(),
    email:String(fd.get("email")||"").trim()
  };
  const ratings={};
  questions.forEach((q,i)=>{ratings[String(i+1)]=Number(fd.get("rating_"+(i+1))||0)});
  return {participant,ratings,suggestions:String(fd.get("suggestions")||"").trim(),submittedAt:new Date().toISOString()};
}
function showStatus(message,type){
  const el=document.getElementById("status");el.textContent=message;el.className="status "+type;
}
async function submitFeedback(event){
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.reportValidity())return;
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
