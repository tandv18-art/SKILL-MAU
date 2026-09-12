window.AIOS_PRICING = [
  {id:'free',name:'Free',price:'0đ',currency:'VND',billingPeriod:null,messageVi:'Trải nghiệm trước khi nâng cấp.',messageEn:'Try the core experience before upgrading.',benefitsVi:['10 lần tạo nội dung','3 ảnh thử miễn phí trọn đời','Không cần thanh toán'],benefitsEn:['10 text generations','3 lifetime trial images','No payment required'],recommended:false,enabled:true,monthlyCredits:null,usageLimits:{text:10,imageLifetime:3},checkoutPlanKey:null},
  {id:'starter',name:'Starter',price:'49.000đ',currency:'VND',billingPeriod:'month',messageVi:'Công cụ nội dung AI cho nhu cầu hằng ngày.',messageEn:'AI content tools for everyday needs.',benefitsVi:['150 lần tạo nội dung / 30 ngày','Không bao gồm lượt tạo ảnh','Nâng cấp linh hoạt khi cần'],benefitsEn:['150 text generations / 30 days','No image-generation quota','Upgrade anytime'],recommended:false,enabled:true,monthlyCredits:null,usageLimits:{text:150,image:0},checkoutPlanKey:'starter'},
  {id:'creator-pro',name:'Creator Pro',price:'129.000đ',currency:'VND',billingPeriod:'month',messageVi:'Dành cho người sáng tạo nội dung thường xuyên.',messageEn:'For frequent content creation.',benefitsVi:['500 lần tạo nội dung / 30 ngày','Không bao gồm lượt tạo ảnh','Phù hợp nội dung đa nền tảng'],benefitsEn:['500 text generations / 30 days','No image-generation quota','Built for multi-platform content'],recommended:false,enabled:true,monthlyCredits:null,usageLimits:{text:500,image:0},checkoutPlanKey:'creator-pro'},
  {id:'seller-pro',name:'Seller Pro',price:'149.000đ',currency:'VND',billingPeriod:'month',messageVi:'Nội dung và hình ảnh cho bán hàng.',messageEn:'Content and images for selling.',benefitsVi:['250 lần tạo nội dung / 30 ngày','8 lần tạo ảnh / 30 ngày','Phù hợp bán hàng và sản phẩm'],benefitsEn:['250 text generations / 30 days','8 image generations / 30 days','Built for commerce workflows'],recommended:true,enabled:true,monthlyCredits:null,usageLimits:{text:250,image:8},checkoutPlanKey:'seller-pro'},
  {id:'photo-pro',name:'Photo Pro',price:'149.000đ',currency:'VND',billingPeriod:'month',messageVi:'Ưu tiên trải nghiệm hình ảnh AI.',messageEn:'Image-first AI experience.',benefitsVi:['50 lần tạo nội dung / 30 ngày','10 lần tạo ảnh / 30 ngày','Phù hợp chỉnh ảnh và sáng tạo hình ảnh'],benefitsEn:['50 text generations / 30 days','10 image generations / 30 days','Built for image creation and enhancement'],recommended:false,enabled:true,monthlyCredits:null,usageLimits:{text:50,image:10},checkoutPlanKey:'photo-pro'},
  {id:'all-in',name:'All-in',price:'249.000đ',currency:'VND',billingPeriod:'month',messageVi:'Hạn mức cao nhất cho toàn bộ nhu cầu.',messageEn:'Highest limits across the whole workspace.',benefitsVi:['500 lần tạo nội dung / 30 ngày','15 lần tạo ảnh / 30 ngày','Dùng toàn bộ công cụ hiện có'],benefitsEn:['500 text generations / 30 days','15 image generations / 30 days','Use all available tools'],recommended:false,enabled:true,monthlyCredits:null,usageLimits:{text:500,image:15},checkoutPlanKey:'all-in'}
];

(() => {
  const checkout = document.createElement('script');
  checkout.src = '/checkout-runtime.js?v=web21-final-quota';
  checkout.async = false;
  document.head.append(checkout);

  const quota = document.createElement('script');
  quota.src = '/quota-ui.js?v=web21-final-quota';
  quota.async = false;
  document.head.append(quota);

  const mainProduct = document.createElement('script');
  mainProduct.src = '/main-product.js?v=web21-main-product';
  mainProduct.async = false;
  document.head.append(mainProduct);
})();
