/* ZIET Mumbai | Fooding & Lodging Feedback
 * Configure APPS_SCRIPT_URL after deploying the PDF-generation backend.
 */
const APPS_SCRIPT_URL = ""; // Paste the Apps Script Web App URL here after backend deployment.
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
function readForm(form){
  const fd=new FormData(form);
  const participant={
    name:String(fd.get("participantName")||"").trim(),
    school:String(fd.get("school")||"").trim(),
    designation:String(fd.get("designation")||"").trim(),
    roomNumber:String(fd.get("roomNumber")||"").trim(),
    email:String(fd.get("email")||"").trim()
  };
  const ratings={};
  questions.forEach((q,i)=>{ratings[String(i+1)]=Number(fd.get("rating_"+(i+1))||0)});
  return {participant,ratings,suggestions:String(fd.get("suggestions")||"").trim(),submittedAt:new Date().toISOString()};
}
function showStatus(message,type){
  const el=document.getElementById("status");
  el.textContent=message;el.className="status "+type;
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
    showStatus("The feedback form is ready, but PDF saving is not connected yet. The administrator must add the Apps Script Web App URL in app.js before participants submit.","warning");
    return;
  }
  btn.disabled=true;btn.textContent="Submitting…";
  try{
    const response=await fetch(APPS_SCRIPT_URL,{
      method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload),redirect:"follow"
    });
    const result=await response.json();
    if(!response.ok||!result.success)throw new Error(result.message||"Submission could not be completed.");
    showStatus(result.message||"Thank you. Your feedback has been submitted and your PDF is ready.","success");
    if(result.pdfUrl){
      const a=document.createElement("a");a.href=result.pdfUrl;a.target="_blank";a.rel="noopener";a.className="download-link";a.textContent="Open / Download your feedback PDF";
      document.getElementById("status").appendChild(document.createElement("br"));
      document.getElementById("status").appendChild(a);
    }
    form.reset();btn.textContent="Submitted";
  }catch(error){
    showStatus("Submission failed: "+error.message,"error");btn.disabled=false;btn.textContent="Submit Feedback";
  }
}
renderQuestions();
document.getElementById("feedbackForm").addEventListener("submit",submitFeedback);
