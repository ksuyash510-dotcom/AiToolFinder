const tools = [
  {name:"ChatGPT",task:"writing",budget:"freemium",skill:"beginner",quality:9,speed:9,ease:10,why:"Best overall writing & reasoning AI"},
  {name:"Claude AI",task:"writing",budget:"freemium",skill:"beginner",quality:10,speed:8,ease:9,why:"Extremely human-like responses"},
  {name:"Perplexity",task:"research",budget:"freemium",skill:"beginner",quality:9,speed:9,ease:9,why:"Real-time web research with citations"},

  {name:"Leonardo AI",task:"image",budget:"freemium",skill:"beginner",quality:9,speed:8,ease:9,why:"Best free image generation"},
  {name:"Ideogram",task:"image",budget:"free",skill:"beginner",quality:9,speed:9,ease:9,why:"Best for text-in-image"},
  {name:"Playground AI",task:"image",budget:"freemium",skill:"beginner",quality:9,speed:8,ease:9,why:"Powerful + free credits"},

  {name:"Runway ML",task:"video",budget:"freemium",skill:"intermediate",quality:9,speed:8,ease:7,why:"Best AI video creation"},
  {name:"Pika Labs",task:"video",budget:"freemium",skill:"beginner",quality:9,speed:8,ease:9,why:"Very easy cinematic videos"},
  {name:"HeyGen",task:"video",budget:"paid",skill:"beginner",quality:9,speed:9,ease:10,why:"Best talking avatar videos"},

  {name:"Gamma AI",task:"ppt",budget:"freemium",skill:"beginner",quality:9,speed:10,ease:10,why:"Best AI PPT generator"},
  {name:"Tome AI",task:"ppt",budget:"freemium",skill:"beginner",quality:8,speed:9,ease:9,why:"Beautiful storytelling slides"},

  {name:"Replit AI",task:"coding",budget:"freemium",skill:"beginner",quality:9,speed:9,ease:10,why:"AI coding inside IDE"},
  {name:"Codeium",task:"coding",budget:"free",skill:"beginner",quality:9,speed:9,ease:10,why:"Best free code assistant"},
  {name:"Phind",task:"coding",budget:"freemium",skill:"intermediate",quality:10,speed:8,ease:9,why:"Best AI search for devs"},

  {name:"ElevenLabs",task:"voice",budget:"freemium",skill:"beginner",quality:10,speed:9,ease:9,why:"Most realistic AI voices"},
  {name:"PlayHT",task:"voice",budget:"freemium",skill:"beginner",quality:9,speed:9,ease:9,why:"High quality voice cloning"},

  {name:"Suno",task:"music",budget:"freemium",skill:"beginner",quality:10,speed:10,ease:10,why:"Best AI music generator"},
  {name:"Udio",task:"music",budget:"freemium",skill:"beginner",quality:9,speed:9,ease:9,why:"Studio quality music"},

  {name:"KickResume",task:"resume",budget:"freemium",skill:"beginner",quality:9,speed:9,ease:10,why:"Professional resume builder"},
  {name:"Enhancv",task:"resume",budget:"freemium",skill:"beginner",quality:9,speed:9,ease:9,why:"Modern ATS resumes"},

  {name:"Durably",task:"website",budget:"freemium",skill:"beginner",quality:9,speed:10,ease:10,why:"One-click website creation"},
  {name:"Framer AI",task:"website",budget:"freemium",skill:"beginner",quality:10,speed:9,ease:9,why:"Best AI website builder"}
];

function recommend(){
  const task = document.getElementById("task").value;
  const budget = document.getElementById("budget").value;
  const skill = document.getElementById("skill").value;
  const priority = document.getElementById("priority").value;

  if(!task || !budget || !skill || !priority){
    alert("Please select all options");
    return;
  }

  let filtered = tools.filter(t=>
    t.task===task &&
    (budget==="paid" || t.budget===budget || t.budget==="freemium") &&
    (skill==="advanced" || t.skill===skill || t.skill==="beginner")
  );

  filtered.forEach(t=>{
    if(priority==="quality") t.score=t.quality*2 + t.ease + t.speed;
    if(priority==="speed") t.score=t.speed*2 + t.ease + t.quality;
    if(priority==="ease") t.score=t.ease*2 + t.speed + t.quality;
  });

  filtered.sort((a,b)=>b.score-a.score);

  showResults(filtered.slice(0,3));
}

function showResults(list){
  const res=document.getElementById("results");
  res.innerHTML="";

  if(list.length===0){
    res.innerHTML="<p>No tools found. Try different options.</p>";
    return;
  }

  list.forEach((t,i)=>{
    const div=document.createElement("div");
    div.className="card";
    div.innerHTML=`
      <span class="tag">#${i+1} Recommended</span>
      <h3>${t.name}</h3>
      <p>${t.why}</p>
    `;
    res.appendChild(div);
  });
}
