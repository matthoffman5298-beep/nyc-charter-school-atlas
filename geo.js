/* Shared geographic calculations: distances are great-circle miles, never travel time. */
(function(root){
const distance=(a,b)=>{const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;return 3958.7613*2*Math.asin(Math.sqrt(Math.min(1,h)));};
function ring(p,r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){let [x,y]=r[i],[u,v]=r[j];if((y>p[1])!==(v>p[1])&&p[0]<(u-x)*(p[1]-y)/(v-y)+x)inside=!inside;}return inside;}
function polygon(p,rs){return ring(p,rs[0])&&!rs.slice(1).some(r=>ring(p,r));}
function contains(p,g){return (g.type==='MultiPolygon'?g.coordinates:[g.coordinates]).some(rs=>polygon(p,rs));}
const api={distance,contains};if(typeof module!=='undefined')module.exports=api;else root.AtlasGeo=api;
})(typeof window==='undefined'?{}:window);
