import json,os,re
B=os.path.dirname(__file__); D=os.path.join(B,'..','data')
P=json.load(open(os.path.join(D,'preview.json')))
t=open(os.path.join(D,'decide-dryrun-2026-10-13.txt')).read(); dr=json.loads(t[t.index('{'):])
copy=open('/workspace/repos/canaries/src/lib/canaryCopy.ts').read()
names=dict(re.findall(r'"([a-z0-9-]+)": \{\s*name: "([^"]+)"',copy))
state=json.load(open('/workspace/repos/canaries/data/state.json'))
W={c['id']:c['weight'] for c in state['canaries']}
K=0.90; NEW={'curve-10y2y':0.06,'real-10y':0.04}
raw={i:round(W[i]*K,4) for i in W}; diff=round(1-sum(raw.values())-sum(NEW.values()),4); raw['vix-vix3m']=round(raw['vix-vix3m']+diff,4)
NW={**raw,**NEW}
assert abs(sum(NW.values())-1)<1e-9, sum(NW.values())
sc={i['id']:i['new'] for i in dr['inputs']}; rd={i['id']:i for i in dr['inputs']}
c=P['canaries']; sc['curve-10y2y']=c['curve-10y2y']['score']; sc['real-10y']=c['real-10y']['score']
old=round(sum(W[i]*sc[i] for i in W),3); new=round(sum(NW[i]*sc[i] for i in NW),3)
# 12 Oct pack version (bond market closed 12 Oct Columbus Day -> last Treasury print 9 Oct)
def at(ch,d):
    k=max(j for j,x in enumerate(ch['d']) if x<=d); return ch['s'][k],ch['y'][k],ch['d'][k]
s12={x['id']:x['score'] for x in state['canaries']}
cv12=at(c['curve-10y2y']['chart'],'2026-10-12'); rv12=at(c['real-10y']['chart'],'2026-10-12')
s12c={**s12,'curve-10y2y':cv12[0],'real-10y':rv12[0]}
old12=round(sum(W[i]*s12[i] for i in W),3); new12=round(sum(NW[i]*s12c[i] for i in NW),3)
light=lambda s:'Green' if s>=0.6 else 'Red' if s<-0.3 else 'Amber'
summary={'weights':{'old':W,'new':NW},'scores13Oct':sc,'composite':{'12Oct':{'old':old12,'new':new12,'curve':cv12,'real':rv12},'13Oct_provisional':{'old':old,'new':new}}}
json.dump(summary,open(os.path.join(D,'composite.json'),'w'),indent=1)
print(json.dumps(summary['composite']),old,light(old),new,light(new))
names['curve-10y2y']='Yield curve (10y − 2y)'; names['real-10y']='Real interest rate (10y)'
read={**{i:rd[i]['reading'] for i in rd},'curve-10y2y':f"{c['curve-10y2y']['value']:+.2f} pts · avg {c['curve-10y2y']['sma20']:+.2f} · last inverted {c['curve-10y2y']['lastInverted']}",
      'real-10y':f"{c['real-10y']['value']:.2f}% > SMA20 {c['real-10y']['sma20']:.2f}% · higher than {c['real-10y']['pctOfHistoryLower']}% of days since 2003"}
order=sorted(NW,key=lambda i:-NW[i])
rows=''.join(f"""<tr class="{'new' if i in NEW else ''}"><td>{names.get(i,i)}{' <span class=tag>NEW</span>' if i in NEW else ''}</td>
<td class="sig s{(sc[i]>0)-(sc[i]<0)}">{'Healthy' if sc[i]>0 else 'Warning' if sc[i]<0 else 'Neutral'} <small>({sc[i]:+d})</small></td>
<td class=mono>{read[i]}</td><td class=mono>{W.get(i,0):.4f}</td><td class=mono>{NW[i]:.4f}</td><td class=mono>{NW[i]*sc[i]:+.4f}</td>
<td>{'<button class=cb onclick="openChart(\''+i+'\')">Chart</button>' if i in NEW else ''}</td></tr>""" for i in order)
html=open(os.path.join(B,'template.html')).read()
html=(html.replace('/*LWC*/',open(os.path.join(B,'lwc.js')).read()).replace('__DATA__',json.dumps(P)).replace('__ROWS__',rows)
 .replace('__OLD__',f"{old:+.3f}").replace('__NEW__',f"{new:+.3f}").replace('__OLDL__',light(old)).replace('__NEWL__',light(new))
 .replace('__OLD12__',f"{old12:+.3f}").replace('__NEW12__',f"{new12:+.3f}"))
open(os.path.join(B,'..','canary-macro-preview.html'),'w').write(html)
