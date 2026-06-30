import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Send, Calculator, HelpCircle } from 'lucide-react';

import { useToast } from '../../components/ui/Toast';
import { getQuotation, createQuotation, updateQuotation, submitQuotation } from '../../services/quotationApi';
import { getCustomers } from '../../services/customerApi';
import { getInsuranceProducts } from '../../services/productApi';
import type { QuotationFormData, InsuranceProduct } from '../../types/SalesTypes';
import logoImg from '../../assets/image/supremogen_logo.jpg';

export default function QuotationFormPage({ id: propId, onClose, onSuccess }: { id?: number; onClose?: () => void; onSuccess?: () => void }) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId ?? (routeId ? Number(routeId) : undefined);
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // References for calculator popups
  const basicCalcBtnRef = useRef<HTMLButtonElement>(null);
  const netCalcBtnRef = useRef<HTMLButtonElement>(null);

  // Form states
  const [customerId, setCustomerId] = useState<number>(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');

  // Policy Information
  const [agent, setAgent] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('STANDARD INSURANCE');
  const [assuredValue, setAssuredValue] = useState<number>(0);
  const [seater, setSeater] = useState<number>(5);

  // Coverages
  const [covOwnDamage, setCovOwnDamage] = useState<number>(0);
  const [covTheftLoss, setCovTheftLoss] = useState<number>(0);
  const [covAON, setCovAON] = useState<number>(0);
  const [covBI, setCovBI] = useState<number>(200000);
  const [covPD, setCovPD] = useState<number>(200000);
  const [covPA, setCovPA] = useState<number>(250000);

  // Premiums
  const [premOD, setPremOD] = useState<number>(0);
  const [premAON, setPremAON] = useState<number>(0);
  const [premBI, setPremBI] = useState<number>(420);
  const [premPD, setPremPD] = useState<number>(1245);
  const [premPA, setPremPA] = useState<number>(250);

  // Calculator inputs (Basic Premium Popup)
  const [sellingRateOD, setSellingRateOD] = useState<number>(1.90);
  const [sellingRateAON, setSellingRateAON] = useState<number>(0.10);
  const [towingFee, setTowingFee] = useState<number>(300);
  const [subAgentMarkup, setSubAgentMarkup] = useState<number>(0);
  const [freebieCashback, setFreebieCashback] = useState<number>(0);

  // Discount & Net Premium
  const [discount, setDiscount] = useState<number>(0);
  const [policyPremium, setPolicyPremium] = useState<number>(0);

  // Popup states
  const [showBasicCalc, setShowBasicCalc] = useState(false);
  const [showNetCalc, setShowNetCalc] = useState(false);

  // Fetch products
  const { data: productsRes } = useQuery({
    queryKey: ['insurance-products'],
    queryFn: getInsuranceProducts,
  });
  const products: InsuranceProduct[] = productsRes?.data ?? [];

  // Fetch customers
  const { data: customersRes } = useQuery({
    queryKey: ['customers-dropdown', customerSearch],
    queryFn: () => getCustomers({ search: customerSearch, per_page: 100 }),
  });
  const customerOptions = customersRes?.data?.data ?? [];

  // Fetch existing quotation
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotation(Number(id)),
    enabled: isEdit,
  });

  // Load existing data
  useEffect(() => {
    if (existing?.data) {
      const q = existing.data;
      setCustomerId(q.customer_id);
      setValidUntil(q.valid_until?.split('T')[0] ?? '');
      setNotes(q.notes ?? '');

      const firstItem = q.items?.[0];
      if (firstItem && firstItem.coverage_details) {
        const details = firstItem.coverage_details;
        setAgent(details.agent || '');
        setInsuranceProvider(details.insurance_provider || 'STANDARD INSURANCE');
        setSeater(Number(details.seater) || 5);
        setAssuredValue(Number(firstItem.sum_insured) || 0);

        const cov = details.coverages || {};
        setCovOwnDamage(Number(cov.own_damage) || 0);
        setCovTheftLoss(Number(cov.theft_loss) || 0);
        setCovAON(Number(cov.aon) || 0);
        setCovBI(Number(cov.bi) || 200000);
        setCovPD(Number(cov.pd) || 200000);
        setCovPA(Number(cov.pa) || 250000);

        const prem = details.premiums || {};
        setPremOD(Number(prem.od) || 0);
        setPremAON(Number(prem.aon) || 0);
        setPremBI(Number(prem.bi) || 420);
        setPremPD(Number(prem.pd) || 1245);
        setPremPA(Number(prem.pa) || 250);

        const calc = details.calculator || {};
        setSellingRateOD(Number(calc.selling_rate_od) || 1.90);
        setSellingRateAON(Number(calc.selling_rate_aon) || 0.10);
        setTowingFee(Number(calc.towing_fee) || 300);
        setSubAgentMarkup(Number(calc.sub_agent_markup) || 0);
        setFreebieCashback(Number(calc.freebie_cashback) || 0);

        setDiscount(Number(details.discount) || 0);
        setPolicyPremium(Number(firstItem.premium_amount) || 0);
      }
    }
  }, [existing]);

  // Handle Assured Value change
  const handleAssuredValueChange = (val: number) => {
    setAssuredValue(val);
    setCovOwnDamage(val);
    setCovTheftLoss(val);
    setCovAON(val);

    // Auto-calculate OD and AON premiums
    const odPrem = Math.round((val * sellingRateOD / 100) * 100) / 100;
    const aonPrem = Math.round((val * sellingRateAON / 100) * 100) / 100;
    setPremOD(odPrem);
    setPremAON(aonPrem);
  };

  // Re-calculate OD and AON premiums if rates change
  useEffect(() => {
    const odPrem = Math.round((assuredValue * sellingRateOD / 100) * 100) / 100;
    const aonPrem = Math.round((assuredValue * sellingRateAON / 100) * 100) / 100;
    setPremOD(odPrem);
    setPremAON(aonPrem);
  }, [sellingRateOD, sellingRateAON]);

  // Calculate values for the Basic Premium Calculator
  const basicPremiumSum = Number(premOD) + Number(premAON) + Number(premBI) + Number(premPD) + Number(premPA);
  const gpMultiplier = Math.round((basicPremiumSum * 1.2525) * 100) / 100;
  const grossPremium = Math.round((gpMultiplier + Number(towingFee)) * 100) / 100;
  const totalPremiumCalculated = Math.round((grossPremium + Number(subAgentMarkup) + Number(freebieCashback)) * 100) / 100;

  // Auto-apply the calculated total premium to policyPremium
  useEffect(() => {
    setPolicyPremium(totalPremiumCalculated);
  }, [totalPremiumCalculated]);

  const netPremium = Math.round((policyPremium - discount) * 100) / 100;

  // Auto-calculate discount if target net is selected
  const applyTargetNetPremium = (targetNet: number) => {
    const calculatedDiscount = Math.round((policyPremium - targetNet) * 100) / 100;
    setDiscount(calculatedDiscount > 0 ? calculatedDiscount : 0);
  };

  // Mutations
  const createMut = useMutation({
    mutationFn: (data: QuotationFormData) => createQuotation(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast('Quotation created successfully.');
      if (onSuccess) onSuccess();
      else navigate(`/dashboard/quotations/${res.data.id}`);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to create.', 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (data: QuotationFormData) => updateQuotation(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      showToast('Quotation updated successfully.');
      if (onSuccess) onSuccess();
      else navigate(`/dashboard/quotations/${id}`);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to update.', 'error'),
  });

  const submitMut = useMutation({
    mutationFn: (qid: number) => submitQuotation(qid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast('Quotation submitted for review.');
      if (onSuccess) onSuccess();
      else navigate('/dashboard/quotations');
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to submit.', 'error'),
  });

  const buildPayload = (): QuotationFormData => {
    const coverageDetails = {
      agent,
      insurance_provider: insuranceProvider,
      seater,
      coverages: {
        own_damage: covOwnDamage,
        theft_loss: covTheftLoss,
        aon: covAON,
        bi: covBI,
        pd: covPD,
        pa: covPA,
      },
      premiums: {
        od: premOD,
        aon: premAON,
        bi: premBI,
        pd: premPD,
        pa: premPA,
      },
      calculator: {
        selling_rate_od: sellingRateOD,
        selling_rate_aon: sellingRateAON,
        towing_fee: towingFee,
        sub_agent_markup: subAgentMarkup,
        freebie_cashback: freebieCashback,
      },
      discount,
      net_premium: netPremium,
    };

    return {
      customer_id: customerId,
      valid_until: validUntil || undefined,
      notes: notes || undefined,
      items: [
        {
          insurance_product_id: products[0]?.id ?? 1,
          description: 'Motor Car Insurance',
          sum_insured: assuredValue,
          premium_rate: sellingRateOD + sellingRateAON,
          premium_amount: policyPremium,
          coverage_details: coverageDetails,
        }
      ],
    };
  };

  const handleSave = () => {
    if (!customerId) { showToast('Please select a customer.', 'error'); return; }
    const data = buildPayload();
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  const handleSaveAndSubmit = async () => {
    if (!customerId) { showToast('Please select a customer.', 'error'); return; }
    const data = buildPayload();
    try {
      let qid: number;
      if (isEdit) {
        const res = await updateQuotation(Number(id), data);
        qid = res.data.id;
      } else {
        const res = await createQuotation(data);
        qid = res.data.id;
      }
      submitMut.mutate(qid);
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to save.', 'error');
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending || submitMut.isPending;
  const inputClass = 'w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all';
  const labelClass = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

  if (isEdit && loadingExisting) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-700">
      {!onClose && (
        <div className="flex items-center gap-4">
          <button onClick={() => onClose ? onClose() : navigate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
            <p className="text-sm text-slate-500">{isEdit ? 'Update quotation details' : 'Create a new insurance quotation'}</p>
          </div>
        </div>
      )}

      {/* Customer Selection Row */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Customer *</label>
          <select value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))} className={inputClass}>
            <option value={0}>Select a customer...</option>
            {customerOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.customer_code} — {c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Valid Until</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Optional notes..." />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Form Content */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
          
          {/* Policy Information */}
          <div>
            <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Policy Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Agent</label>
                <input type="text" value={agent} onChange={(e) => setAgent(e.target.value)} className={inputClass} placeholder="Enter agent name..." />
              </div>
              <div>
                <label className={labelClass}>Insurance Provider</label>
                <select value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} className={inputClass}>
                  <option value="STANDARD INSURANCE">STANDARD INSURANCE</option>
                  <option value="MAPFRE INSURANCE">MAPFRE INSURANCE</option>
                  <option value="FPG INSURANCE">FPG INSURANCE</option>
                  <option value="PIONEER INSURANCE">PIONEER INSURANCE</option>
                  <option value="COCOGEN INSURANCE">COCOGEN INSURANCE</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Assured Value (₱)</label>
                <input type="number" value={assuredValue || ''} onChange={(e) => handleAssuredValueChange(Number(e.target.value))} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className={labelClass}>Seater</label>
                <select value={seater} onChange={(e) => setSeater(Number(e.target.value))} className={inputClass}>
                  {[2, 4, 5, 7, 8, 10, 12, 15].map((s) => (
                    <option key={s} value={s}>{s} Seater</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Coverages and Premiums Grid */}
          <div>
            <div className="grid grid-cols-2 gap-6 mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider">Coverage</h3>
              <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider">Premium</h3>
            </div>
            
            <div className="space-y-3">
              {/* Own Damage */}
              <div className="grid grid-cols-2 gap-6 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Own Damage</label>
                  <input type="number" value={covOwnDamage || ''} onChange={(e) => setCovOwnDamage(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">OD Premium</label>
                  <input type="number" value={premOD || ''} onChange={(e) => setPremOD(Number(e.target.value))} className={inputClass} />
                </div>
              </div>

              {/* Theft and Loss */}
              <div className="grid grid-cols-2 gap-6 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Theft and Loss</label>
                  <input type="number" value={covTheftLoss || ''} onChange={(e) => setCovTheftLoss(Number(e.target.value))} className={inputClass} />
                </div>
                <div className="text-xs text-slate-400 italic px-3">
                  Included in OD Premium
                </div>
              </div>

              {/* Acts of Nature (AON) */}
              <div className="grid grid-cols-2 gap-6 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Acts of Nature (AON)</label>
                  <input type="number" value={covAON || ''} onChange={(e) => setCovAON(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">AON Premium</label>
                  <input type="number" value={premAON || ''} onChange={(e) => setPremAON(Number(e.target.value))} className={inputClass} />
                </div>
              </div>

              {/* Bodily Injury (BI) */}
              <div className="grid grid-cols-2 gap-6 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Bodily Injury (BI)</label>
                  <input type="number" value={covBI || ''} onChange={(e) => setCovBI(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">BI Premium</label>
                  <input type="number" value={premBI || ''} onChange={(e) => setPremBI(Number(e.target.value))} className={inputClass} />
                </div>
              </div>

              {/* Property Damage (PD) */}
              <div className="grid grid-cols-2 gap-6 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Property Damage (PD)</label>
                  <input type="number" value={covPD || ''} onChange={(e) => setCovPD(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">PD Premium</label>
                  <input type="number" value={premPD || ''} onChange={(e) => setPremPD(Number(e.target.value))} className={inputClass} />
                </div>
              </div>

              {/* Auto Passenger (PA) */}
              <div className="grid grid-cols-2 gap-6 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Auto Passenger (PA)</label>
                  <input type="number" value={covPA || ''} onChange={(e) => setCovPA(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">PA Premium</label>
                  <input type="number" value={premPA || ''} onChange={(e) => setPremPA(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Calculator Section */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Calculator Triggers and Inline Calculators */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-3">
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Calculators</h4>
            
            <button
              type="button"
              onClick={() => { setShowBasicCalc(!showBasicCalc); setShowNetCalc(false); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#4A0E17]/5 hover:bg-[#4A0E17]/10 text-[#4A0E17] font-bold text-sm rounded-2xl transition-all cursor-pointer border border-[#4A0E17]/10"
            >
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Basic Premium Calc
              </span>
              <span className="text-xs bg-[#4A0E17] text-white px-2.5 py-0.5 rounded-lg font-mono">
                ₱{basicPremiumSum.toLocaleString()}
              </span>
            </button>

            {/* Inline Basic Premium Calculator */}
            {showBasicCalc && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 space-y-3 mt-2 animate-scale-in">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-[#4A0E17]" />
                  <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider">Basic Premium Calc</h4>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selling Rate (OD) %</label>
                    <input type="number" step="0.01" value={sellingRateOD} onChange={(e) => setSellingRateOD(Number(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selling Rate (AON) %</label>
                    <input type="number" step="0.01" value={sellingRateAON} onChange={(e) => setSellingRateAON(Number(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20" />
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-dashed border-slate-200">
                    <span className="text-slate-500">Basic Premium</span>
                    <span className="font-semibold text-slate-800 font-mono">₱{basicPremiumSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">GP * 1.2525</span>
                    <span className="font-semibold text-slate-800 font-mono">₱{gpMultiplier.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Towing Fee / RAP (₱)</label>
                    <input type="number" value={towingFee} onChange={(e) => setTowingFee(Number(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20" />
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Gross Premium</span>
                    <span className="font-bold text-slate-800 font-mono">₱{grossPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sub-Agent Mark Up (₱)</label>
                    <input type="number" value={subAgentMarkup} onChange={(e) => setSubAgentMarkup(Number(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Freebie & Cashback (₱)</label>
                    <input type="number" value={freebieCashback} onChange={(e) => setFreebieCashback(Number(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20" />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-[#4A0E17]/20">
                    <span className="font-bold text-[#4A0E17] uppercase">Total Premium</span>
                    <span className="font-extrabold text-[#4A0E17] font-mono text-sm">₱{totalPremiumCalculated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setShowNetCalc(!showNetCalc); setShowBasicCalc(false); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-sm rounded-2xl transition-all cursor-pointer border border-emerald-100"
            >
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" /> NET Premium Calc
              </span>
              <span className="text-xs bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg font-mono">
                ₱{netPremium.toLocaleString()}
              </span>
            </button>

            {/* Inline NET Premium Calculator */}
            {showNetCalc && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 space-y-3 mt-2 animate-scale-in">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-emerald-800" />
                  <h4 className="font-bold text-xs text-emerald-800 uppercase tracking-wider">NET Premium Calc</h4>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100 space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Total Premium:</span>
                      <span className="font-mono font-bold text-slate-700">₱{policyPremium.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Discount:</span>
                      <span className="font-mono font-bold text-red-600">₱{discount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => applyTargetNetPremium(Math.round(policyPremium * 0.70))}
                      className="w-full text-center py-2 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Apply 30% Agent Discount
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTargetNetPremium(Math.round(policyPremium * 0.65))}
                      className="w-full text-center py-2 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Apply 35% Agent Discount
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target NET Premium (₱)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Enter target net..."
                      onChange={(e) => {
                        if (e.target.value) applyTargetNetPremium(Number(e.target.value));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Details Panel */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-2">Pricing Details</h4>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Policy Premium</span>
                <span className="font-bold text-slate-800 font-mono text-base">₱{policyPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Discount</span>
                <div className="w-36">
                  <input
                    type="number"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right text-sm font-mono text-red-600 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="font-bold text-slate-700">NET Premium</span>
                <span className="font-bold text-emerald-700 font-mono text-xl">₱{netPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => onClose ? onClose() : navigate(-1)}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer">
          Cancel
        </button>
        <button onClick={handleSave} disabled={isSaving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-slate-700 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save as Draft
        </button>
        <button onClick={handleSaveAndSubmit} disabled={isSaving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#4A0E17] hover:bg-[#3D0B12] disabled:opacity-50 shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Save & Submit
        </button>
      </div>
    </div>
  );
}
