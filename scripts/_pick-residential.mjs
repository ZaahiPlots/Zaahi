import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
function cat(s){const l=(s||"").toLowerCase();
 if(/residential|villa|townhouse|\bapartment\b/.test(l))return"RESIDENTIAL";
 if(/commercial|office|retail|showroom|\bcbd\b/.test(l))return"COMMERCIAL";
 if(/hotel|hospitality|resort|serviced\s*apartment/.test(l))return"HOTEL";
 if(/industrial|warehouse|factory|logistics|storage/.test(l))return"INDUSTRIAL";
 if(/educat|school|university|academy|nursery/.test(l))return"EDUCATIONAL";
 if(/health|hospital|clinic|medical/.test(l))return"HEALTHCARE";
 if(/agricult|\bfarm\b/.test(l))return"AGRICULTURAL";
 if(/future\s*development/.test(l))return"FUTURE_DEVELOPMENT";return null;}
function dv(mix){if(!mix||!mix.length)return null;const c=new Set();
 for(const u of mix){const a=cat(u.category||""),b=cat(u.sub||"");if(a)c.add(a);if(b)c.add(b);}
 return c.size>1?"MIXED_USE":c.size===1?[...c][0]:null;}
const ps=await prisma.parcel.findMany({select:{plotNumber:true,district:true,geometry:true,
 affectionPlans:{orderBy:{fetchedAt:"desc"},take:1,select:{landUseMix:true,maxFloors:true,buildingLimitGeometry:true,plotAreaSqft:true}}}});
const rows=[];
for(const p of ps){const ap=p.affectionPlans[0];if(dv(ap?.landUseMix)!=="RESIDENTIAL")continue;
 const fp=ap?.buildingLimitGeometry||p.geometry;
 if(!fp||fp.type!=="Polygon")continue;
 const pts=fp.coordinates[0].length;const fl=ap?.maxFloors||0;
 rows.push({plot:p.plotNumber,district:p.district,floors:fl,pts,hasLimit:!!ap?.buildingLimitGeometry,area:Math.round(ap?.plotAreaSqft||0)});}
// prefer 12-30 floors and fewest points
rows.sort((a,b)=>(a.pts-b.pts)|| (b.floors-a.floors));
console.log("simplest residential footprints (12-30 fl preferred):");
for(const r of rows.filter(r=>r.floors>=10&&r.floors<=35).slice(0,12))console.log("  ",JSON.stringify(r));
console.log("--- all by pts (top 10) ---");
for(const r of rows.slice(0,10))console.log("  ",JSON.stringify(r));
await prisma.$disconnect();
