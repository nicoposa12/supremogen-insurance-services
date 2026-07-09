import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Send, Calculator, UploadCloud } from 'lucide-react';

import { useToast } from '../../components/ui/Toast';
import { getQuotation, createQuotation, updateQuotation, submitQuotation } from '../../services/quotationApi';
import { getCustomer, updateCustomer, createCustomer } from '../../services/customerApi';
import { uploadAttachment } from '../../services/attachmentApi';
import { getInsuranceProducts } from '../../services/productApi';
import type { QuotationFormData, InsuranceProduct } from '../../types/SalesTypes';
import { parseFullName } from '../customers/CustomersPage';
import { useAuth } from '../../context/AuthContext';

const formatRawInput = (val: string | number): string => {
  if (val === undefined || val === null) return '';
  // Remove all characters except digits and a single decimal point
  let clean = String(val).replace(/[^\d.]/g, '');

  // Handle multiple decimal points
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }

  // Format the integer part with commas
  const integerPart = parts[0];
  const decimalPart = parts[1];

  const formattedInt = integerPart ? Number(integerPart).toLocaleString('en-US') : '';

  if (decimalPart !== undefined) {
    return `${formattedInt}.${decimalPart}`;
  }
  return formattedInt;
};

const parseStringToNumber = (val: string | number): number => {
  if (val === undefined || val === null || val === '') return 0;
  const clean = String(val).replace(/,/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const roundToTwoDecimals = (num: number): number => {
  return Math.round(num * 100 + 1e-9) / 100;
};

const BI_RATES_PRIVATE_SEDAN_SUV: Record<number, number> = {
  50000: 195,
  75000: 225,
  100000: 270,
  150000: 345,
  200000: 420,
  250000: 510,
  300000: 585,
  400000: 675,
  500000: 780,
  750000: 915,
  1000000: 1050
};

const PD_RATES_PRIVATE_SEDAN_SUV: Record<number, number> = {
  50000: 975,
  75000: 1035,
  100000: 1095,
  150000: 1170,
  200000: 1245,
  250000: 1320,
  300000: 1395,
  400000: 1515,
  500000: 1635,
  750000: 1920,
  1000000: 2235
};

const BI_RATES_MOTORCYCLE: Record<number, number> = {
  50000: 75,
  75000: 90,
  100000: 105,
  150000: 120,
  200000: 135,
  250000: 150
};

const PD_RATES_MOTORCYCLE: Record<number, number> = {
  50000: 450,
  75000: 510,
  100000: 555,
  150000: 645,
  200000: 720,
  250000: 795
};

const BI_RATES_COMMERCIAL_VEHICLE: Record<number, number> = {
  50000: 225,
  75000: 285,
  100000: 345,
  150000: 420,
  200000: 510,
  250000: 585,
  300000: 660,
  400000: 750,
  500000: 855,
  750000: 945,
  1000000: 1050
};

const PD_RATES_COMMERCIAL_VEHICLE: Record<number, number> = {
  50000: 1050,
  75000: 1110,
  100000: 1170,
  150000: 1245,
  200000: 1320,
  250000: 1395,
  300000: 1485,
  400000: 1575,
  500000: 1680,
  750000: 2100,
  1000000: 2535
};

export default function QuotationFormPage({ id: propId, onClose, onSuccess }: { id?: number; onClose?: () => void; onSuccess?: () => void }) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId ?? (routeId ? Number(routeId) : undefined);
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();

  // Form states
  const [customerId, setCustomerId] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [writingDate, setWritingDate] = useState('');

  // Customer states (linked to Policy Issuance Request)
  const [requestType, setRequestType] = useState('');
  const [activity, setActivity] = useState('');
  const [quotationUsed, setQuotationUsed] = useState('');
  const [usage, setUsage] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [color, setColor] = useState('');
  const [ownership, setOwnership] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [subAgentName, setSubAgentName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [backupPhone, setBackupPhone] = useState('');
  const [fbLink, setFbLink] = useState('');
  const [usedRateType, setUsedRateType] = useState('');
  const [usedRate, setUsedRate] = useState('');

  // For editable personal/contact fields
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [deedOfSaleFile, setDeedOfSaleFile] = useState<File | null>(null);

  const handleFullNameChange = (val: string) => {
    setFullName(val);
    const parsed = parseFullName(val);
    setFirstName(parsed.firstName);
    setLastName(parsed.lastName);
    setMiddleName(parsed.middleName);
    setSuffix(parsed.suffix);
  };
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [inceptionDate, setInceptionDate] = useState('');

  const [plateNo, setPlateNo] = useState('');
  const [unit, setUnit] = useState('');
  const [mortgage, setMortgage] = useState('');

  // File Upload states
  const [orcrFile, setOrcrFile] = useState<File | null>(null);
  const [ellaScreenshotFile, setEllaScreenshotFile] = useState<File | null>(null);

  // Policy Information
  const [agent, setAgent] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('STANDARD INSURANCE');
  const [seater, setSeater] = useState<number>(5);

  // Coverages (represented as formatted strings)
  const [covOwnDamage, setCovOwnDamage] = useState<string>('');
  const [covAON, setCovAON] = useState<string>('');
  const [covBI, setCovBI] = useState<string>('');
  const [covPD, setCovPD] = useState<string>('');
  const [covPA, setCovPA] = useState<string>('');

  const [customBI, setCustomBI] = useState(false);
  const [customPD, setCustomPD] = useState(false);

  // Premiums
  const [premOD, setPremOD] = useState<string>('');
  const [premAON, setPremAON] = useState<string>('');
  const [premBI, setPremBI] = useState<string>('');
  const [premPD, setPremPD] = useState<string>('');
  const [premPA, setPremPA] = useState<string>('');

  // Calculator inputs (Basic Premium Popup)
  const [sellingRateOD, setSellingRateOD] = useState<number>(1.90);
  const [sellingRateAON, setSellingRateAON] = useState<number>(0.10);
  const [towingFee, setTowingFee] = useState<string>('');
  const [subAgentMarkup, setSubAgentMarkup] = useState<string>('');
  const [freebieCashback, setFreebieCashback] = useState<string>('');

  const [policyPremium, setPolicyPremium] = useState<number>(0);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Popup states
  const [showBasicCalc, setShowBasicCalc] = useState(false);

  const cleanQuotationUsed = (quotationUsed || '').trim().toUpperCase();
  const cleanUsage = (usage || '').trim().toUpperCase();
  const isPrivateSedanSuv = (
    cleanQuotationUsed === 'SUV' ||
    cleanQuotationUsed === 'SEDAN' ||
    cleanQuotationUsed === 'EV/HYBRID'
  ) && cleanUsage === 'PRIVATE';

  const isMotorcyclePrivate = cleanQuotationUsed === 'MOTOR' && (
    cleanUsage === 'PRIVATE' ||
    cleanUsage === 'MOTORCYCLE PRIVATE'
  );

  const isTruck = cleanQuotationUsed === 'TRUCKS';
  const isCommercialVehicle = isTruck || cleanQuotationUsed === 'FOR HIRE' || cleanUsage === 'FOR HIRE' || cleanQuotationUsed === 'L300/H100' || cleanQuotationUsed === 'LALAMOVE' || cleanQuotationUsed === 'YELLOW PLATE' || cleanUsage === 'YELLOW PLATE' || cleanQuotationUsed === 'TNVS' || cleanUsage === 'TNVS USE';

  // Fetch products
  const { data: productsRes } = useQuery({
    queryKey: ['insurance-products'],
    queryFn: getInsuranceProducts,
  });
  const products: InsuranceProduct[] = productsRes?.data ?? [];



  // Fetch selected customer details
  const { data: selectedCustomerRes } = useQuery({
    queryKey: ['customer-details', customerId],
    queryFn: () => getCustomer(customerId),
    enabled: !!customerId && customerId !== 0,
  });
  const selectedCustomer = selectedCustomerRes?.data;

  // Fetch existing quotation
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotation(Number(id)),
    enabled: isEdit,
  });

  // Populate form when editing quotation
  useEffect(() => {
    if (existing?.data) {
      const q = existing.data;
      setCustomerId(q.customer_id);
      setNotes(q.notes ?? '');

      const firstItem = q.items?.[0];
      if (firstItem && firstItem.coverage_details) {
        const details = firstItem.coverage_details;
        setAgent(details.agent || '');
        setInsuranceProvider(details.insurance_provider || 'STANDARD INSURANCE');
        setSeater(Number(details.seater) || 5);

        const cov = details.coverages || {};
        setCovOwnDamage(Number(cov.own_damage) ? Number(cov.own_damage).toLocaleString('en-US') : '');
        setCovAON(Number(cov.aon) ? Number(cov.aon).toLocaleString('en-US') : '');
        setCovBI(Number(cov.bi) ? Number(cov.bi).toLocaleString('en-US') : '');
        setCovPD(Number(cov.pd) ? Number(cov.pd).toLocaleString('en-US') : '');
        setCovPA(Number(cov.pa) ? Number(cov.pa).toLocaleString('en-US') : '');

        const prem = details.premiums || {};
        setPremOD(Number(prem.od) ? Number(prem.od).toLocaleString('en-US') : '');
        setPremAON(Number(prem.aon) ? Number(prem.aon).toLocaleString('en-US') : '');
        setPremBI(Number(prem.bi) ? Number(prem.bi).toLocaleString('en-US') : '');
        setPremPD(Number(prem.pd) ? Number(prem.pd).toLocaleString('en-US') : '');
        setPremPA(Number(prem.pa) ? Number(prem.pa).toLocaleString('en-US') : '');

        const calc = details.calculator || {};
        setSellingRateOD(Number(calc.selling_rate_od) || 1.90);
        setSellingRateAON(Number(calc.selling_rate_aon) || 0.10);
        setTowingFee(Number(calc.towing_fee) ? Number(calc.towing_fee).toLocaleString('en-US') : '');
        setSubAgentMarkup(Number(calc.sub_agent_markup) ? Number(calc.sub_agent_markup).toLocaleString('en-US') : '');
        setFreebieCashback(Number(calc.freebie_cashback) ? Number(calc.freebie_cashback).toLocaleString('en-US') : '');

        setPolicyPremium(Number(firstItem.premium_amount) || 0);
      }
    }
  }, [existing]);

  // Populate agent name from authenticated user account on create
  useEffect(() => {
    if (!isEdit && user?.name) {
      setAgent((prev) => prev || user.name);
    }
  }, [isEdit, user]);

  // Automatically update usedRate when selling rates change
  useEffect(() => {
    const formatRatePercent = (rate: number): string => {
      const formatted = rate.toFixed(2);
      if (formatted.startsWith('0.')) {
        return formatted.slice(1) + '%';
      }
      return formatted + '%';
    };
    if (sellingRateOD !== undefined && sellingRateAON !== undefined) {
      setUsedRate(`${formatRatePercent(sellingRateOD)} - ${formatRatePercent(sellingRateAON)}`);
    }
  }, [sellingRateOD, sellingRateAON]);

  // Populate customer fields on selection
  useEffect(() => {
    if (selectedCustomer) {
      const c = selectedCustomer;
      const nameParts = [c.first_name, c.middle_name, c.last_name, c.suffix].filter(Boolean).join(' ');
      setFullName(nameParts);
      setFirstName(c.first_name || '');
      setLastName(c.last_name || '');
      setMiddleName(c.middle_name || '');
      setSuffix(c.suffix || '');
      setEmail(c.email || '');
      setMobile(c.mobile || '');
      setAddressLine1(c.address_line_1 || '');
      setCity(c.city || '');
      setProvince(c.province || '');
      setZipCode(c.zip_code || '');
      setInceptionDate(c.inception_date ? c.inception_date.split('T')[0] : '');

      setWritingDate(c.writing_date ? c.writing_date.split('T')[0] : '');
      setRequestType(c.request_type || '');
      setActivity(c.activity || '');
      setQuotationUsed(c.quotation_used || '');
      setUsage(c.usage || '');
      setChassisNo(c.chassis_no || '');
      setEngineNo(c.engine_no || '');
      setColor(c.color || '');
      setOwnership(c.ownership || '');
      setPaymentTerms(c.payment_terms ? String(c.payment_terms) : '');
      setSubAgentName(c.sub_agent_name || '');
      setReceiverName(c.receiver_name || '');
      setDeliveryAddress(c.delivery_address || '');
      setLandmark(c.landmark || '');
      setBackupPhone(c.backup_phone || '');
      setFbLink(c.fb_link || '');
      setUsedRateType(c.used_rate_type || '');
      setUsedRate(c.used_rate || '');

      setPlateNo(c.plate_no || '');
      setUnit(c.unit || '');
      setMortgage(c.mortgage || '');

      if (!isEdit) {
        if (c.agent) setAgent(c.agent);
        if (c.insurance_provider) setInsuranceProvider(c.insurance_provider);
        if (c.own_damage_coverage) setCovOwnDamage(Number(c.own_damage_coverage) ? Number(c.own_damage_coverage).toLocaleString('en-US') : '');
        if (c.aog) setCovAON(Number(c.aog) ? Number(c.aog).toLocaleString('en-US') : '');
        if (c.bi_coverage) setCovBI(Number(c.bi_coverage) ? Number(c.bi_coverage).toLocaleString('en-US') : '');
        if (c.pd_coverage) setCovPD(Number(c.pd_coverage) ? Number(c.pd_coverage).toLocaleString('en-US') : '');
        if (c.pa) setCovPA(Number(c.pa) ? Number(c.pa).toLocaleString('en-US') : '');
      }
    }
  }, [selectedCustomer, isEdit]);

  // Auto-calculate BI and PD premiums when coverages are changed based on rates
  useEffect(() => {
    const biVal = parseStringToNumber(covBI);
    let expectedBIPremium: number | undefined;
    if (isPrivateSedanSuv) {
      expectedBIPremium = BI_RATES_PRIVATE_SEDAN_SUV[biVal];
    } else if (isMotorcyclePrivate) {
      expectedBIPremium = BI_RATES_MOTORCYCLE[biVal];
    } else if (isCommercialVehicle) {
      expectedBIPremium = BI_RATES_COMMERCIAL_VEHICLE[biVal];
    }

    if (expectedBIPremium !== undefined) {
      const formatted = expectedBIPremium.toLocaleString('en-US');
      if (premBI !== formatted) {
        setPremBI(formatted);
      }
    } else if (biVal === 0 && premBI !== '') {
      setPremBI('');
    }

    const pdVal = parseStringToNumber(covPD);
    let expectedPDPremium: number | undefined;
    if (isPrivateSedanSuv) {
      expectedPDPremium = PD_RATES_PRIVATE_SEDAN_SUV[pdVal];
    } else if (isMotorcyclePrivate) {
      expectedPDPremium = PD_RATES_MOTORCYCLE[pdVal];
    } else if (isCommercialVehicle) {
      expectedPDPremium = PD_RATES_COMMERCIAL_VEHICLE[pdVal];
    }

    if (expectedPDPremium !== undefined) {
      const formatted = expectedPDPremium.toLocaleString('en-US');
      if (premPD !== formatted) {
        setPremPD(formatted);
      }
    } else if (pdVal === 0 && premPD !== '') {
      setPremPD('');
    }
  }, [covBI, covPD, premBI, premPD, isPrivateSedanSuv, isMotorcyclePrivate, isCommercialVehicle]);

  // Auto-calculate PA Premium based on Seater (100 per seat)
  useEffect(() => {
    if (seater) {
      const calculatedPA = (seater * 100).toLocaleString('en-US');
      if (premPA !== calculatedPA) {
        setPremPA(calculatedPA);
      }
    }
  }, [seater, premPA]);

  // Update Selling Rates based on vehicle type and usage
  useEffect(() => {
    const cleanQuotationUsed = (quotationUsed || '').trim().toUpperCase();
    const cleanUsage = (usage || '').trim().toUpperCase();
    const isPrivateSUV = cleanQuotationUsed === 'SUV' && cleanUsage === 'PRIVATE';
    const isPrivateSedan = cleanQuotationUsed === 'SEDAN' && cleanUsage === 'PRIVATE';
    const isPrivateEV = cleanQuotationUsed === 'EV/HYBRID' && cleanUsage === 'PRIVATE';

    if (cleanQuotationUsed === 'FOR HIRE' || cleanUsage === 'FOR HIRE' || cleanQuotationUsed === 'YELLOW PLATE' || cleanUsage === 'YELLOW PLATE') {
      setSellingRateOD(2.60);
      setSellingRateAON(0.10);
    } else if (cleanQuotationUsed === 'L300/H100') {
      setSellingRateOD(1.95);
      setSellingRateAON(0.10);
    } else if (cleanQuotationUsed === 'LALAMOVE') {
      setSellingRateOD(2.55);
      setSellingRateAON(0.10);
    } else if (cleanQuotationUsed === 'TNVS' || cleanUsage === 'TNVS USE') {
      setSellingRateOD(1.80);
      setSellingRateAON(0.10);
    } else if (isPrivateSUV) {
      setSellingRateOD(1.30);
      setSellingRateAON(0.10);
    } else if (isPrivateSedan) {
      setSellingRateOD(1.50);
      setSellingRateAON(0.10);
    } else if (isPrivateEV) {
      setSellingRateOD(2.20);
      setSellingRateAON(0.10);
    } else if (cleanQuotationUsed === 'MOTOR' && (cleanUsage === 'PRIVATE' || cleanUsage === 'MOTORCYCLE PRIVATE')) {
      setSellingRateOD(2.40);
      setSellingRateAON(0.10);
    } else {
      setSellingRateOD(1.90);
      setSellingRateAON(0.10);
    }
  }, [quotationUsed, usage]);

  // Auto-calculate OD and AON premiums based on coverage and rates
  useEffect(() => {
    const odVal = parseStringToNumber(covOwnDamage);
    if (odVal > 0) {
      const calculatedOD = roundToTwoDecimals(odVal * (sellingRateOD / 100));
      const formatted = calculatedOD ? calculatedOD.toLocaleString('en-US') : '';
      if (premOD !== formatted) {
        setPremOD(formatted);
      }
    } else if (odVal === 0 && premOD !== '') {
      setPremOD('');
    }

    const aonVal = parseStringToNumber(covAON);
    if (aonVal > 0) {
      const calculatedAON = roundToTwoDecimals(aonVal * (sellingRateAON / 100));
      const formatted = calculatedAON ? calculatedAON.toLocaleString('en-US') : '';
      if (premAON !== formatted) {
        setPremAON(formatted);
      }
    } else if (aonVal === 0 && premAON !== '') {
      setPremAON('');
    }
  }, [covOwnDamage, covAON, sellingRateOD, sellingRateAON, premOD, premAON]);



  // Calculate values for the Basic Premium Calculator
  const numPremOD = parseStringToNumber(premOD);
  const numPremAON = parseStringToNumber(premAON);
  const numPremBI = parseStringToNumber(premBI);
  const numPremPD = parseStringToNumber(premPD);
  const numPremPA = parseStringToNumber(premPA);
  const numTowingFee = parseStringToNumber(towingFee);
  const numSubAgentMarkup = parseStringToNumber(subAgentMarkup);
  const numFreebieCashback = parseStringToNumber(freebieCashback);

  const basicPremiumSum = numPremOD + numPremAON + numPremBI + numPremPD + numPremPA;
  const isMotor = cleanQuotationUsed === 'MOTOR';

  // For Motor: DST, E-VAT, LGT
  const dst = isMotor ? roundToTwoDecimals(basicPremiumSum * 0.125) : 0;
  const eVat = isMotor ? roundToTwoDecimals(basicPremiumSum * 0.12) : 0;
  const lgt = isMotor ? roundToTwoDecimals(basicPremiumSum * 0.002) : 0;
  const totalTaxAndPremium = basicPremiumSum + dst + eVat + lgt;

  // For Others: GP * 1.2525 + 1500
  const gpMultiplier = isMotor ? 0 : roundToTwoDecimals((basicPremiumSum * 1.2525) + 1500);

  const grossPremium = isMotor
    ? roundToTwoDecimals(totalTaxAndPremium + 3500 + numTowingFee)
    : roundToTwoDecimals(gpMultiplier + numTowingFee);

  const totalPremiumCalculated = roundToTwoDecimals(grossPremium + numSubAgentMarkup + numFreebieCashback);

  // Auto-apply the calculated total premium to policyPremium
  useEffect(() => {
    setPolicyPremium(totalPremiumCalculated);
  }, [totalPremiumCalculated]);



  // Helper for sequential uploads
  const uploadFormFiles = async (targetCustomerId: number) => {
    if (orcrFile) {
      try {
        await uploadAttachment('customer', targetCustomerId, orcrFile, 'orcr_ndos_4sides');
      } catch (e: any) {
        console.error('Failed to upload ORCR', e);
        showToast('Failed to upload ORCR file: ' + (e.response?.data?.message ?? e.message), 'error');
      }
    }
    if (ellaScreenshotFile) {
      try {
        await uploadAttachment('customer', targetCustomerId, ellaScreenshotFile, 'ella_langrio_screenshot');
      } catch (e: any) {
        console.error('Failed to upload Ella Langrio convo screenshot', e);
        showToast('Failed to upload Ella Langrio screenshot: ' + (e.response?.data?.message ?? e.message), 'error');
      }
    }
    if (deedOfSaleFile) {
      try {
        await uploadAttachment('customer', targetCustomerId, deedOfSaleFile, 'deed_of_sale_ndos');
      } catch (e: any) {
        console.error('Failed to upload Deed of Sale attachment', e);
        showToast('Failed to upload Deed of Sale: ' + (e.response?.data?.message ?? e.message), 'error');
      }
    }
    setOrcrFile(null);
    setEllaScreenshotFile(null);
    setDeedOfSaleFile(null);
  };

  // Save/Update Customer details
  const saveCustomerDetails = async () => {
    const custData = {
      first_name: firstName,
      last_name: lastName,
      middle_name: middleName,
      suffix: suffix,
      email: email || undefined,
      mobile: mobile,
      address_line_1: addressLine1,
      city: city,
      province: province,
      zip_code: zipCode,
      inception_date: inceptionDate || undefined,
      expiry_date: (() => {
        if (!inceptionDate) return undefined;
        const d = new Date(inceptionDate);
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().split('T')[0];
      })(),

      request_type: requestType,
      writing_date: writingDate,
      activity: activity,
      quotation_used: quotationUsed,
      usage: usage,
      chassis_no: chassisNo,
      engine_no: engineNo,
      color: color,
      ownership: ownership,
      payment_terms: paymentTerms,
      sub_agent_name: subAgentName,
      receiver_name: receiverName,
      delivery_address: deliveryAddress,
      landmark: landmark,
      backup_phone: backupPhone,
      fb_link: fbLink,
      used_rate_type: usedRateType,
      used_rate: usedRate,

      plate_no: plateNo,
      unit: unit,
      mortgage: mortgage,
      agent: agent,
      insurance_provider: insuranceProvider,

      own_damage_coverage: parseStringToNumber(covOwnDamage),
      aog: parseStringToNumber(covAON),
      bi_coverage: parseStringToNumber(covBI),
      pd_coverage: parseStringToNumber(covPD),
      pa: parseStringToNumber(covPA),
      policy_premium: policyPremium,
      sub_agent_markup: numSubAgentMarkup,
      freebie: numFreebieCashback,
    };

    let targetCustomerId = customerId;
    if (customerId && customerId !== 0) {
      await updateCustomer(customerId, custData as any);
    } else {
      const res = await createCustomer(custData as any);
      targetCustomerId = res.data.id;
      setCustomerId(targetCustomerId);
    }
    await uploadFormFiles(targetCustomerId);
    return targetCustomerId;
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
      setIsSavingLocal(false);
      if (onSuccess) onSuccess();
      else navigate('/dashboard/quotations');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to submit.', 'error');
      setIsSavingLocal(false);
    },
  });

  const buildPayload = (targetCid?: number): QuotationFormData => {
    const coverageDetails = {
      agent: agent,
      insurance_provider: insuranceProvider,
      seater,
      coverages: {
        own_damage: parseStringToNumber(covOwnDamage),
        theft_loss: 0,
        aon: parseStringToNumber(covAON),
        bi: parseStringToNumber(covBI),
        pd: parseStringToNumber(covPD),
        pa: parseStringToNumber(covPA),
      },
      premiums: {
        od: numPremOD,
        aon: numPremAON,
        bi: numPremBI,
        pd: numPremPD,
        pa: numPremPA,
      },
      calculator: {
        selling_rate_od: sellingRateOD,
        selling_rate_aon: sellingRateAON,
        towing_fee: numTowingFee,
        sub_agent_markup: numSubAgentMarkup,
        freebie_cashback: numFreebieCashback,
      },
      discount: 0,
      net_premium: policyPremium,
    };

    return {
      customer_id: targetCid || customerId,
      valid_until: undefined,
      notes: notes || undefined,
      items: [
        {
          insurance_product_id: products[0]?.id ?? 1,
          description: 'Motor Car Insurance',
          sum_insured: 0,
          premium_rate: sellingRateOD + sellingRateAON,
          premium_amount: policyPremium,
          coverage_details: coverageDetails,
        }
      ],
    };
  };



  const handleSaveAndSubmit = async () => {
    setSubmitAttempted(true);

    // Validate all fields with asterisks
    const requiredFields = [
      { value: writingDate, name: 'Date Request' },
      { value: requestType, name: 'Request Type' },
      { value: activity, name: 'Activity' },
      { value: insuranceProvider, name: 'Provider' },
      { value: quotationUsed, name: 'Quotation Used' },
      { value: usage, name: 'Usage' },
      { value: fullName, name: 'Assured Full Name' },
      { value: email, name: 'Email Address' },
      { value: mobile, name: 'Contact No.#' },
      { value: addressLine1, name: 'Address Line 1' },
      { value: city, name: 'City' },
      { value: province, name: 'Province' },
      { value: unit, name: 'Year Model & Make' },
      { value: chassisNo, name: 'Chassis #' },
      { value: engineNo, name: 'Engine #' },
      { value: color, name: 'Color' },
      { value: plateNo, name: 'Plate Number' },
      { value: mortgage, name: 'Bank' },
      { value: inceptionDate, name: 'Inception Date' },
      { value: ownership, name: 'Ownership' },
      { value: paymentTerms, name: 'Payment Terms' },
      { value: usedRateType, name: 'Used Rate Type' },
      { value: usedRate, name: 'Used Rate' },
      { value: receiverName, name: "Receiver's Name" },
      { value: deliveryAddress, name: 'Delivery Address' },
      { value: landmark, name: 'Landmark' },
    ];

    const needsDeedOfSale = ['2ND OWNER', '3RD OWNER', '4TH OWNER'].includes(ownership);
    const hasMissingFields = requiredFields.some(f => !f.value || !f.value.toString().trim()) ||
                             (!isEdit && (!orcrFile || !ellaScreenshotFile || (needsDeedOfSale && !deedOfSaleFile)));

    if (hasMissingFields) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (isSaving) return;
    setIsSavingLocal(true);
    try {
      const targetCid = await saveCustomerDetails();
      const data = buildPayload(targetCid);
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
      setIsSavingLocal(false);
      const serverMessage = err.response?.data?.message;
      const errors = err.response?.data?.errors;
      let detailedMsg = 'Failed to save.';
      if (errors && typeof errors === 'object') {
        const errorDetails = Object.entries(errors)
          .map(([field, msgs]) => {
            const msgStr = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
            return `${field}: ${msgStr}`;
          })
          .join(' | ');
        detailedMsg = `${serverMessage || 'Validation failed'}: ${errorDetails}`;
      } else if (serverMessage) {
        detailedMsg = serverMessage;
      }
      showToast(detailedMsg, 'error');
    }
  };

  const isSaving = isSavingLocal || createMut.isPending || updateMut.isPending || submitMut.isPending;
  const getInputClass = (value: any, isRequired = true) => {
    const isError = submitAttempted && isRequired && (!value || !value.toString().trim());
    return `w-full px-3.5 py-2 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 transition-all ${
      isError 
        ? 'bg-red-50/50 border border-red-500 focus:border-red-500 focus:ring-red-200' 
        : 'bg-slate-50 border border-slate-200 focus:border-[#4A0E17] focus:ring-[#4A0E17]/20'
    }`;
  };

  const getFileLabelClass = (file: File | null) => {
    const isError = submitAttempted && !isEdit && !file;
    return `flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition p-4 text-center ${
      isError
        ? 'bg-red-50/50 border-red-500 hover:bg-red-50 focus:outline-none'
        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
    }`;
  };

  const inputClass = 'w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all';
  const labelClass = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

  if (isEdit && loadingExisting) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-700">
      {!onClose && (
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
            <p className="text-sm text-slate-500">{isEdit ? 'Update quotation details' : 'Create a new insurance quotation'}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Card 1: Request & Activity Details */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Request & Activity Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className={labelClass}>Date Request *</label>
              <input type="date" value={writingDate} onChange={(e) => setWritingDate(e.target.value)} className={getInputClass(writingDate)} />
            </div>
            <div>
              <label className={labelClass}>Type *</label>
              <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className={getInputClass(requestType)}>
                <option value="">Select Type</option>
                <option value="NEW ACCOUNT">NEW ACCOUNT</option>
                <option value="RENEWAL CLIENT">RENEWAL CLIENT</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Activity *</label>
              <select value={activity} onChange={(e) => setActivity(e.target.value)} className={getInputClass(activity)}>
                <option value="">Select Activity</option>
                <option value="POSTING">POSTING</option>
                <option value="SNIPING">SNIPING</option>
                <option value="SUB-AGENT">SUB-AGENT</option>
                <option value="RENEWAL">RENEWAL</option>
                <option value="REFERRAL">REFERRAL</option>
                <option value="NETWORK / EXISTING CLIENT">NETWORK / EXISTING CLIENT</option>
                <option value="KKK">KKK</option>
                <option value="FLYERS">FLYERS</option>
                <option value="FIELD">FIELD</option>
                <option value="PARTNERS">PARTNERS</option>
                <option value="SUPREMO MAIN PAGE">SUPREMO MAIN PAGE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Provider *</label>
              <select value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} className={getInputClass(insuranceProvider)}>
                <option value="">Select Provider</option>
                <option value="ALPHA">ALPHA</option>
                <option value="CBIC">CBIC</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Quotation Used *</label>
              <select value={quotationUsed} onChange={(e) => setQuotationUsed(e.target.value)} className={getInputClass(quotationUsed)}>
                <option value="">Select Quotation</option>
                <option value="SUV">SUV</option>
                <option value="SEDAN">SEDAN</option>
                <option value="TNVS">TNVS</option>
                <option value="TRUCKS">TRUCKS</option>
                <option value="MOTOR">MOTOR</option>
                <option value="OLD CAR">OLD CAR</option>
                <option value="L300/H100">L300/H100</option>
                <option value="FOR HIRE">FOR HIRE</option>
                <option value="YELLOW PLATE">YELLOW PLATE</option>
                <option value="LALAMOVE">LALAMOVE</option>
                <option value="EV/HYBRID">EV/HYBRID</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Usage *</label>
              <select value={usage} onChange={(e) => setUsage(e.target.value)} className={getInputClass(usage)}>
                <option value="">Select Usage</option>
                <option value="PRIVATE">PRIVATE</option>
                <option value="TNVS USE">TNVS USE</option>
                <option value="YELLOW PLATE">YELLOW PLATE</option>
                <option value="FOR HIRE">FOR HIRE</option>
                <option value="MOTORCYCLE PRIVATE">MOTORCYCLE PRIVATE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Assured Personal & Contact Info */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Assured Personal & Contact Information</h3>
          {/* Balanced Name & Contact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Assured Full Name *</label>
              <input type="text" value={fullName} onChange={(e) => handleFullNameChange(e.target.value)} className={getInputClass(fullName)} placeholder="Enter full name (First Middle Last Suffix)" />
            </div>
            <div>
              <label className={labelClass}>Email Address *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={getInputClass(email)} placeholder="email@example.com" />
            </div>

            <div>
              <label className={labelClass}>Contact No.# *</label>
              <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)} className={getInputClass(mobile)} placeholder="Mobile number" />
            </div>
            <div>
              <label className={labelClass}>Back Up No.#</label>
              <input type="text" value={backupPhone} onChange={(e) => setBackupPhone(e.target.value)} className={getInputClass(backupPhone, false)} placeholder="Backup number" />
            </div>
            <div>
              <label className={labelClass}>FB Link</label>
              <input type="text" value={fbLink} onChange={(e) => setFbLink(e.target.value)} className={getInputClass(fbLink, false)} placeholder="https://facebook.com/username" />
            </div>
          </div>
        </div>

        {/* Card 3: Assured Address */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Assured Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Address Line 1 *</label>
              <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={getInputClass(addressLine1)} placeholder="Street Address" />
            </div>
            <div>
              <label className={labelClass}>City *</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={getInputClass(city)} placeholder="City" />
            </div>
            <div>
              <label className={labelClass}>Province *</label>
              <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} className={getInputClass(province)} placeholder="Province" />
            </div>
            <div>
              <label className={labelClass}>Zip Code</label>
              <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className={getInputClass(zipCode, false)} placeholder="Zip code" />
            </div>
          </div>
        </div>

        {/* Card 4: Vehicle Information */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Vehicle Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Year Model & Make *</label>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className={getInputClass(unit)} placeholder="e.g. 2024 TOYOTA FORTUNER" />
            </div>
            <div>
              <label className={labelClass}>Chassis # *</label>
              <input type="text" value={chassisNo} onChange={(e) => setChassisNo(e.target.value)} className={getInputClass(chassisNo)} placeholder="Chassis number" />
            </div>
            <div>
              <label className={labelClass}>Engine # *</label>
              <input type="text" value={engineNo} onChange={(e) => setEngineNo(e.target.value)} className={getInputClass(engineNo)} placeholder="Engine number" />
            </div>
            <div>
              <label className={labelClass}>Color *</label>
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className={getInputClass(color)} placeholder="Color" />
            </div>
            <div>
              <label className={labelClass}>Plate Number *</label>
              <input type="text" value={plateNo} onChange={(e) => setPlateNo(e.target.value)} className={getInputClass(plateNo)} placeholder="Plate or MV File No." />
            </div>
            <div>
              <label className={labelClass}>Bank *</label>
              <select value={mortgage} onChange={(e) => setMortgage(e.target.value)} className={getInputClass(mortgage)}>
                <option value="">Select Bank</option>
                <option value="TFSPH">TFSPH</option>
                <option value="EASTWEST">EASTWEST</option>
                <option value="MAYBANK">MAYBANK</option>
                <option value="BPI">BPI</option>
                <option value="BDO UNIBANK INC.">BDO UNIBANK INC.</option>
                <option value="PS BANK">PS BANK</option>
                <option value="SECURITY BANK">SECURITY BANK</option>
                <option value="MALAYAN SAVINGS BANK">MALAYAN SAVINGS BANK</option>
                <option value="METROBANK">METROBANK</option>
                <option value="UCPB SAVINGS">UCPB SAVINGS</option>
                <option value="LUZON DEVELOPMENT BANK">LUZON DEVELOPMENT BANK</option>
                <option value="PHILIPPINE BANK OF COMMUNICATION (PBCOM)">PHILIPPINE BANK OF COMMUNICATION (PBCOM)</option>
                <option value="RCBC">RCBC</option>
                <option value="PHILIPPINE BUSINESS BANK (PBB)">PHILIPPINE BUSINESS BANK (PBB)</option>
                <option value="SOUTH ASIALINK FINANCING CORP">SOUTH ASIALINK FINANCING CORP</option>
                <option value="N/A">N/A</option>
                <option value="ASIALINK">ASIALINK</option>
                <option value="CHINA BANK SAVINGS">CHINA BANK SAVINGS</option>
                <option value="CHINA BANK">CHINA BANK</option>
                <option value="GLOBAL DOMINION FINANCING INC">GLOBAL DOMINION FINANCING INC</option>
                <option value="LANDBANK">LANDBANK</option>
                <option value="ORICO AUTO FINANCE PHILIPPINES">ORICO AUTO FINANCE PHILIPPINES</option>
                <option value="BANK OF COMMERCE">BANK OF COMMERCE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Inception Date *</label>
              <input type="date" value={inceptionDate} onChange={(e) => setInceptionDate(e.target.value)} className={getInputClass(inceptionDate)} />
            </div>
            <div>
              <label className={labelClass}>Ownership *</label>
              <select value={ownership} onChange={(e) => setOwnership(e.target.value)} className={getInputClass(ownership)}>
                <option value="">Select Ownership</option>
                <option value="1ST OWNER">1ST OWNER</option>
                <option value="2ND OWNER">2ND OWNER</option>
                <option value="3RD OWNER">3RD OWNER</option>
                <option value="4TH OWNER">4TH OWNER</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 5: Terms, Rates & Markup */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Terms, Rates & Markup</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Payment Terms *</label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className={getInputClass(paymentTerms)}>
                <option value="">Select Terms</option>
                <option value="1">1 Month</option>
                <option value="3">3 Months</option>
                <option value="4">4 Months</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Sub-Agent's Name</label>
              <input type="text" value={subAgentName} onChange={(e) => setSubAgentName(e.target.value)} className={getInputClass(subAgentName, false)} placeholder="Sub-agent full name" />
            </div>
            <div>
              <label className={labelClass}>Used Rate Type *</label>
              <select value={usedRateType} onChange={(e) => setUsedRateType(e.target.value)} className={getInputClass(usedRateType)}>
                <option value="">Select Rate Type</option>
                <option value="PARTNER'S RATE">PARTNER'S RATE</option>
                <option value="OLD CAR">OLD CAR</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Used Rate (Example: 1.30% - .10%) *</label>
              <input type="text" value={usedRate} onChange={(e) => setUsedRate(e.target.value)} className={getInputClass(usedRate)} placeholder="e.g. 1.30% - .10%" />
            </div>
          </div>
        </div>

        {/* Card 6: Delivery Details */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Delivery Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Receiver's Name *</label>
              <input type="text" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className={getInputClass(receiverName)} placeholder="Receiver full name" />
            </div>
            <div>
              <label className={labelClass}>Delivery Address *</label>
              <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className={getInputClass(deliveryAddress)} placeholder="Complete delivery address" />
            </div>
            <div>
              <label className={labelClass}>Landmark *</label>
              <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)} className={getInputClass(landmark)} placeholder="Nearby landmark description" />
            </div>
          </div>
        </div>

        {/* Card 7: Document Attachments */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Document Attachments</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1 mb-2">
                ORCR / NDOS / 4 SIDES (Upload) <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className={`relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 p-4 ${
                orcrFile 
                  ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/60 shadow-sm shadow-emerald-100/50' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400/80 hover:shadow-sm'
              }`}>
                {orcrFile ? (
                  <div className="flex flex-col items-center justify-center space-y-1 w-full max-w-[90%] text-center">
                    <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-xs text-emerald-900 font-bold truncate max-w-full" title={orcrFile.name}>
                      {orcrFile.name}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase font-mono">
                      {(orcrFile.size / 1024 / 1024).toFixed(2)} MB • Ready
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setOrcrFile(null)} 
                      className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-slate-200/50 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                      title="Remove file"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                    <div className="h-9 w-9 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center shadow-sm mb-1.5 transition-colors hover:border-slate-300">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-slate-700 font-bold">
                      Click to select file
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Upload ORCR / NDOS / 4 Sides (max 10MB)
                    </span>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) setOrcrFile(e.target.files[0]);
                      }} 
                      accept="image/*,application/pdf" 
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1 mb-2">
                Ella Langrio Convo Screenshot (Upload) <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className={`relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 p-4 ${
                ellaScreenshotFile 
                  ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/60 shadow-sm shadow-emerald-100/50' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400/80 hover:shadow-sm'
              }`}>
                {ellaScreenshotFile ? (
                  <div className="flex flex-col items-center justify-center space-y-1 w-full max-w-[90%] text-center">
                    <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-xs text-emerald-900 font-bold truncate max-w-full" title={ellaScreenshotFile.name}>
                      {ellaScreenshotFile.name}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase font-mono">
                      {(ellaScreenshotFile.size / 1024 / 1024).toFixed(2)} MB • Ready
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setEllaScreenshotFile(null)} 
                      className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-slate-200/50 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                      title="Remove file"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                    <div className="h-9 w-9 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center shadow-sm mb-1.5 transition-colors hover:border-slate-300">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-slate-700 font-bold">
                      Click to select file
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Upload Convo Screenshot (max 10MB)
                    </span>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) setEllaScreenshotFile(e.target.files[0]);
                      }} 
                      accept="image/*,application/pdf" 
                    />
                  </label>
                )}
              </div>
            </div>

            {['2ND OWNER', '3RD OWNER', '4TH OWNER'].includes(ownership) && (
              <div>
                <label className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1 mb-2">
                  Deed of Sale / NDOS (Upload) <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className={`relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 p-4 ${
                  deedOfSaleFile 
                    ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/60 shadow-sm shadow-emerald-100/50' 
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400/80 hover:shadow-sm'
                }`}>
                  {deedOfSaleFile ? (
                    <div className="flex flex-col items-center justify-center space-y-1 w-full max-w-[90%] text-center">
                      <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-xs text-emerald-900 font-bold truncate max-w-full" title={deedOfSaleFile.name}>
                        {deedOfSaleFile.name}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase font-mono">
                        {(deedOfSaleFile.size / 1024 / 1024).toFixed(2)} MB • Ready
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setDeedOfSaleFile(null)} 
                        className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-slate-200/50 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                        title="Remove file"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                      <div className="h-9 w-9 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center shadow-sm mb-1.5 transition-colors hover:border-slate-300">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-slate-700 font-bold">
                        Click to select file
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Upload Deed of Sale / NDOS (max 10MB)
                      </span>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) setDeedOfSaleFile(e.target.files[0]);
                        }} 
                        accept="image/*,application/pdf" 
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 8: Coverages & Calculator Form */}
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
                  <label className={labelClass}>Seater</label>
                  <select value={seater} onChange={(e) => setSeater(Number(e.target.value))} className={inputClass}>
                    {[2, 3, 4, 5, 7, 8, 10, 12, 15].map((s) => (
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

              <div className="space-y-4">
                {/* Own Damage */}
                <div className="grid grid-cols-2 gap-6 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">OWN DAMAGE COVERAGE</label>
                    <input type="text" value={covOwnDamage} onChange={(e) => {
                      const val = formatRawInput(e.target.value);
                      setCovOwnDamage(val);
                      setCovAON(val);
                    }} className={inputClass} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">OD Premium</label>
                    <input type="text" value={premOD} onChange={(e) => setPremOD(formatRawInput(e.target.value))} className={inputClass} placeholder="0.00" />
                  </div>
                </div>

                {/* Acts of Nature (AON) */}
                <div className="grid grid-cols-2 gap-6 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">ACTS OF NATURE COVERAGE</label>
                    <input type="text" value={covAON} onChange={(e) => {
                      const val = formatRawInput(e.target.value);
                      setCovAON(val);
                      setCovOwnDamage(val);
                    }} className={inputClass} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">AON Premium</label>
                    <input type="text" value={premAON} onChange={(e) => setPremAON(formatRawInput(e.target.value))} className={inputClass} placeholder="0.00" />
                  </div>
                </div>

                {/* Bodily Injury (BI) */}
                <div className="grid grid-cols-2 gap-6 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">BODILY INJURY</label>
                    {!customBI ? (
                      <select
                        value={parseStringToNumber(covBI).toString()}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setCustomBI(true);
                            setCovBI('');
                            setCustomPD(true);
                            setCovPD('');
                          } else {
                            const valNum = Number(e.target.value);
                            const formatted = valNum ? valNum.toLocaleString('en-US') : '';
                            setCovBI(formatted);
                            setCovPD(formatted);
                            setCustomPD(false);
                          }
                        }}
                        className={inputClass}
                      >
                        <option value="0">Select Coverage</option>
                        <option value="50000">50,000</option>
                        <option value="75000">75,000</option>
                        <option value="100000">100,000</option>
                        <option value="150000">150,000</option>
                        <option value="200000">200,000</option>
                        <option value="250000">250,000</option>
                        {!isMotorcyclePrivate && (
                          <>
                            <option value="300000">300,000</option>
                            <option value="400000">400,000</option>
                            <option value="500000">500,000</option>
                            <option value="750000">75,0000</option>
                            <option value="1000000">1,000,000</option>
                          </>
                        )}
                        {covBI && !['0', '50000', '75000', '100000', '150000', '200000', '250000', '300000', '400000', '500000', '750000', '1000000'].includes(parseStringToNumber(covBI).toString()) && (
                          <option value={parseStringToNumber(covBI).toString()}>{covBI}</option>
                        )}
                        <option value="custom">Custom (Type manually...)</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={covBI}
                          onChange={(e) => {
                            const val = formatRawInput(e.target.value);
                            setCovBI(val);
                            setCovPD(val);
                          }}
                          className={inputClass}
                          placeholder="0.00"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomBI(false);
                            setCovBI('');
                            setCustomPD(false);
                            setCovPD('');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl transition"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">BI Premium</label>
                    <input
                      type="text"
                      value={premBI}
                      onChange={(e) => setPremBI(formatRawInput(e.target.value))}
                      className={inputClass}
                      placeholder="0.00"
                      disabled={!customBI && (isPrivateSedanSuv || isMotorcyclePrivate || isCommercialVehicle)}
                    />
                  </div>
                </div>

                {/* Property Damage (PD) */}
                <div className="grid grid-cols-2 gap-6 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">PROPERTY DAMAGE</label>
                    {!customPD ? (
                      <select
                        value={parseStringToNumber(covPD).toString()}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setCustomPD(true);
                            setCovPD('');
                            setCustomBI(true);
                            setCovBI('');
                          } else {
                            const valNum = Number(e.target.value);
                            const formatted = valNum ? valNum.toLocaleString('en-US') : '';
                            setCovPD(formatted);
                            setCovBI(formatted);
                            setCustomBI(false);
                          }
                        }}
                        className={inputClass}
                      >
                        <option value="0">Select Coverage</option>
                        <option value="50000">50,000</option>
                        <option value="75000">75,000</option>
                        <option value="100000">100,000</option>
                        <option value="150000">150,000</option>
                        <option value="200000">200,000</option>
                        <option value="250000">250,000</option>
                        {!isMotorcyclePrivate && (
                          <>
                            <option value="300000">300,000</option>
                            <option value="400000">400,000</option>
                            <option value="500000">500,000</option>
                            <option value="750000">750,000</option>
                            <option value="1000000">1,000,000</option>
                          </>
                        )}
                        {covPD && !['0', '50000', '75000', '100000', '150000', '200000', '250000', '300000', '400000', '500000', '750000', '1000000'].includes(parseStringToNumber(covPD).toString()) && (
                          <option value={parseStringToNumber(covPD).toString()}>{covPD}</option>
                        )}
                        <option value="custom">Custom (Type manually...)</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={covPD}
                          onChange={(e) => {
                            const val = formatRawInput(e.target.value);
                            setCovPD(val);
                            setCovBI(val);
                          }}
                          className={inputClass}
                          placeholder="0.00"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomPD(false);
                            setCovPD('');
                            setCustomBI(false);
                            setCovBI('');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl transition"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">PD Premium</label>
                    <input
                      type="text"
                      value={premPD}
                      onChange={(e) => setPremPD(formatRawInput(e.target.value))}
                      className={inputClass}
                      placeholder="0.00"
                      disabled={!customPD && (isPrivateSedanSuv || isMotorcyclePrivate || isCommercialVehicle)}
                    />
                  </div>
                </div>

                {/* Auto Passenger (PA) */}
                <div className="grid grid-cols-2 gap-6 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">PERSONAL ACCIDENT</label>
                    <input type="text" value={covPA} onChange={(e) => setCovPA(formatRawInput(e.target.value))} className={inputClass} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">PA Premium</label>
                    <input
                      type="text"
                      value={premPA}
                      onChange={(e) => setPremPA(formatRawInput(e.target.value))}
                      className={inputClass}
                      placeholder="0.00"
                      disabled
                    />
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
                onClick={() => setShowBasicCalc(!showBasicCalc)}
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
                    {isMotor ? (
                      <>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">DST (12.5%)</span>
                          <span className="font-semibold text-slate-800 font-mono">₱{dst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">E-VAT (12%)</span>
                          <span className="font-semibold text-slate-800 font-mono">₱{eVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">LGT (0.2%)</span>
                          <span className="font-semibold text-slate-800 font-mono">₱{lgt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">GP * 1.2525</span>
                        <span className="font-semibold text-slate-800 font-mono">₱{gpMultiplier.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Towing Fee / RAP (₱)</label>
                      <input type="text" value={towingFee} onChange={(e) => setTowingFee(formatRawInput(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20" placeholder="0.00" />
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-200">
                      <span className="font-bold text-slate-700">Gross Premium</span>
                      <span className="font-bold text-slate-800 font-mono">₱{grossPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sub-Agent Mark Up (₱)</label>
                      <input type="text" value={subAgentMarkup} onChange={(e) => setSubAgentMarkup(formatRawInput(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Freebie & Cashback (₱)</label>
                      <input type="text" value={freebieCashback} onChange={(e) => setFreebieCashback(formatRawInput(e.target.value))} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20" placeholder="0.00" />
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t-2 border-[#4A0E17]/20">
                      <span className="font-bold text-[#4A0E17] uppercase">Total Premium</span>
                      <span className="font-extrabold text-[#4A0E17] font-mono text-sm">₱{totalPremiumCalculated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                  <span className="font-bold text-slate-700">Total Premium</span>
                  <span className="font-extrabold text-[#4A0E17] font-mono text-xl">₱{policyPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Remarks / Notes Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-3 mt-6">
        <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-2">Remarks / Notes</h3>
        <div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[80px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all resize-none"
            placeholder="Type any remarks or optional notes for this policy request here..."
          />
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => onClose ? onClose() : navigate(-1)}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer">
          Cancel
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
