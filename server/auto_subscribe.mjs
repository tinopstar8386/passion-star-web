// auto_subscribe.mjs - 100% Single Opt-In Automated Newsletter Submitter
// Tự động đăng ký các nguồn giống Word Daily: Chỉ cần Email, Nhận thư thẳng, KHÔNG cần bấm link Confirm

export const SINGLE_OPT_IN_PUBLICATIONS = [
    {
        id: "worddaily",
        name: "Word Daily",
        domain: "https://worddaily.com",
        category: "Từ vựng tiếng Anh",
        frequency: "Mỗi sáng",
        type: "pardon",
        icon: "fa-book-open",
        desc: "Mỗi ngày 1 từ vựng tiếng Anh mới, giải nghĩa chi tiết, phát âm và câu ví dụ."
    },
    {
        id: "wordsmarts",
        name: "Word Smarts",
        domain: "https://wordsmarts.com",
        category: "Ngữ pháp & Tiếng Anh",
        frequency: "Mỗi ngày",
        type: "pardon",
        icon: "fa-spell-check",
        desc: "Mẹo ngữ pháp, thành ngữ tiếng Anh, câu đố từ vựng thực tế."
    },
    {
        id: "interestingfacts",
        name: "Interesting Facts",
        domain: "https://interestingfacts.com",
        category: "Kiến thức kỳ thú",
        frequency: "Mỗi ngày",
        type: "pardon",
        icon: "fa-lightbulb",
        desc: "Những sự thật kỳ thú về khoa học, lịch sử và thế giới mỗi sáng."
    },
    {
        id: "inspiringquotes",
        name: "Inspiring Quotes",
        domain: "https://inspiringquotes.com",
        category: "Danh ngôn & Động lực",
        frequency: "Mỗi ngày",
        type: "pardon",
        icon: "fa-quote-left",
        desc: "Danh ngôn truyền cảm hứng và tư duy tích cực mỗi ngày từ các danh nhân."
    },
    {
        id: "betterreport",
        name: "Better Report",
        domain: "https://betterreport.com",
        category: "Mẹo sống & Sức khỏe",
        frequency: "Mỗi ngày",
        type: "pardon",
        icon: "fa-heart-pulse",
        desc: "Bản tin mẹo vặt cuộc sống, mẹo công nghệ, sức khỏe và tiêu dùng thông minh."
    },
    {
        id: "historyfacts",
        name: "History Facts",
        domain: "https://historyfacts.com",
        category: "Lịch sử thế giới",
        frequency: "Mỗi ngày",
        type: "pardon",
        icon: "fa-landmark",
        desc: "Những câu chuyện và sự thật lịch sử hấp dẫn về các nền văn minh thế giới."
    },
    {
        id: "crosswordclub",
        name: "Crossword Club",
        domain: "https://crosswordclub.com",
        category: "Đố vui & Trí tuệ",
        frequency: "Mỗi ngày",
        type: "pardon",
        icon: "fa-puzzle-piece",
        desc: "Câu đố chữ, rèn luyện não bộ, trò chơi ô chữ và tư duy logic mỗi sáng."
    },
    {
        id: "houseoutlook",
        name: "House Outlook",
        domain: "https://houseoutlook.com",
        category: "Nhà cửa & Không gian",
        frequency: "Mỗi tuần",
        type: "pardon_refresh",
        icon: "fa-house",
        desc: "Ý tưởng thiết kế nội thất, kiến trúc nhà đẹp và phong cách sống hiện đại."
    },
    {
        id: "nicenews",
        name: "Nice News",
        domain: "https://nicenews.com",
        category: "Tin tức tích cực",
        frequency: "Mỗi ngày",
        type: "nicenews",
        icon: "fa-face-smile",
        desc: "Bản tin những tin tức lạc quan, câu chuyện ấm lòng và sự tử tế trên toàn cầu."
    },
    {
        id: "goodheadlines",
        name: "Good Headlines",
        domain: "https://goodheadlines.com",
        category: "Điểm tin vui tươi",
        frequency: "Mỗi ngày",
        type: "webflow",
        siteId: "667b03af4c96fb4374afa400",
        formName: "Email Form",
        emailField: "Email",
        icon: "fa-newspaper",
        desc: "Tổng hợp các tiêu đề tin tức vui tươi, truyền cảm hứng giúp khởi đầu ngày mới."
    },
    {
        id: "moviebrief",
        name: "Movie Brief",
        domain: "https://moviebrief.com",
        category: "Điện ảnh & Phim ảnh",
        frequency: "Mỗi tuần",
        type: "webflow",
        siteId: "665df7b51f919f2ee06528d8",
        formName: "Email Form 1",
        emailField: "Email 1",
        icon: "fa-film",
        desc: "Gợi ý phim hay, tóm tắt đánh giá điện ảnh và các tựa phim chiếu rạp đáng xem."
    }
];

export async function subscribeAll(email) {
    const results = [];
    console.log(`\n🚀 BẮT ĐẦU TỰ ĐỘNG ĐĂNG KÝ ${SINGLE_OPT_IN_PUBLICATIONS.length} NGUỒN SINGLE OPT-IN CHO: ${email}`);
    console.log(`💡 Đặc điểm: Chỉ cần Email • Không cần điền tên • Nhận thư thẳng KHÔNG CẦN BẤM LINK CONFIRM\n${'='.repeat(75)}`);

    for (let i = 0; i < SINGLE_OPT_IN_PUBLICATIONS.length; i++) {
        const pub = SINGLE_OPT_IN_PUBLICATIONS[i];
        console.log(`⏳ [${i + 1}/${SINGLE_OPT_IN_PUBLICATIONS.length}] Đang đăng ký ${pub.name} (${pub.domain})...`);

        try {
            if (pub.type === 'pardon') {
                let nonce = "";
                try {
                    const homeRes = await fetch(pub.domain, {
                        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
                    });
                    const html = await homeRes.text();
                    const matchNonce = html.match(/"pardon_nonce":"([^"]+)"/);
                    if (matchNonce) nonce = matchNonce[1];
                } catch(e) {}

                const body = new URLSearchParams();
                body.append("action", "pardon_subscribe_handler");
                body.append("email", email);
                body.append("form_identifier", "home-subscribe");
                if (nonce) body.append("pardon_nonce", nonce);
                body.append("sub_source", "organic");

                const postRes = await fetch(`${pub.domain}/wp-admin/admin-ajax.php`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": `${pub.domain}/`
                    },
                    body: body
                });

                const text = await postRes.text();
                const isSuccess = postRes.status === 200 && text.includes("200");

                if (isSuccess) {
                    console.log(`✅ [${pub.name}]: THÀNH CÔNG! Đã vào danh bạ nhận bản tin tự động.`);
                    results.push({ name: pub.name, success: true, category: pub.category, note: "Đã kích hoạt nhận thư tự động (Single Opt-in)" });
                } else {
                    console.log(`⚠️ [${pub.name}]: Phản hồi HTTP ${postRes.status}`);
                    results.push({ name: pub.name, success: false, category: pub.category, note: `HTTP ${postRes.status}` });
                }
            } else if (pub.type === 'pardon_refresh') {
                const refreshRes = await fetch(`${pub.domain}/wp-admin/admin-ajax.php`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    },
                    body: new URLSearchParams({ action: "pardon_refresh_nonces" })
                });
                const refreshData = await refreshRes.json();
                const nonce = refreshData?.data?.pardon_nonce || "";

                const body = new URLSearchParams();
                body.append("action", "pardon_subscribe_handler");
                body.append("email", email);
                body.append("form_identifier", "home-subscribe");
                if (nonce) body.append("pardon_nonce", nonce);
                body.append("sub_source", "organic");

                const postRes = await fetch(`${pub.domain}/wp-admin/admin-ajax.php`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": `${pub.domain}/`
                    },
                    body: body
                });

                const text = await postRes.text();
                const isSuccess = postRes.status === 200 && text.includes("200");

                if (isSuccess) {
                    console.log(`✅ [${pub.name}]: THÀNH CÔNG! Đã vào danh bạ nhận bản tin tự động.`);
                    results.push({ name: pub.name, success: true, category: pub.category, note: "Đã kích hoạt nhận thư tự động (Single Opt-in)" });
                } else {
                    console.log(`⚠️ [${pub.name}]: Phản hồi HTTP ${postRes.status}`);
                    results.push({ name: pub.name, success: false, category: pub.category, note: `HTTP ${postRes.status}` });
                }
            } else if (pub.type === 'nicenews') {
                let nonce = "";
                try {
                    const homeRes = await fetch(pub.domain, {
                        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
                    });
                    const html = await homeRes.text();
                    const m = html.match(/"nonce":"([^"]+)"/);
                    if (m) nonce = m[1];
                } catch(e) {}

                const body = new URLSearchParams();
                body.append("action", "nicenews_subscribe");
                body.append("email", email);
                body.append("sub_source", "web+organic");
                if (nonce) body.append("nonce", nonce);

                const postRes = await fetch(`${pub.domain}/wp-admin/admin-ajax.php`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": `${pub.domain}/`
                    },
                    body: body
                });

                const text = await postRes.text();
                const isSuccess = postRes.status === 200 && text.includes("true");

                if (isSuccess) {
                    console.log(`✅ [${pub.name}]: THÀNH CÔNG! Đã vào danh bạ nhận bản tin tự động.`);
                    results.push({ name: pub.name, success: true, category: pub.category, note: "Đã kích hoạt nhận thư tự động (Single Opt-in)" });
                } else {
                    console.log(`⚠️ [${pub.name}]: Phản hồi HTTP ${postRes.status}`);
                    results.push({ name: pub.name, success: false, category: pub.category, note: `HTTP ${postRes.status}` });
                }
            } else if (pub.type === 'webflow') {
                const body = new URLSearchParams();
                body.append("name", pub.formName);
                body.append(`fields[${pub.emailField}]`, email);
                body.append("fields[source]", "organic");

                const postRes = await fetch(`https://webflow.com/api/v1/form/${pub.siteId}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": `${pub.domain}/`
                    },
                    body: body
                });

                const text = await postRes.text();
                const isSuccess = postRes.status === 200 && text.includes("ok");

                if (isSuccess) {
                    console.log(`✅ [${pub.name}]: THÀNH CÔNG! Đã vào danh bạ nhận bản tin tự động.`);
                    results.push({ name: pub.name, success: true, category: pub.category, note: "Đã kích hoạt nhận thư tự động (Single Opt-in)" });
                } else {
                    console.log(`⚠️ [${pub.name}]: Phản hồi HTTP ${postRes.status}`);
                    results.push({ name: pub.name, success: false, category: pub.category, note: `HTTP ${postRes.status}` });
                }
            }
        } catch(err) {
            console.error(`❌ [${pub.name}] Lỗi kết nối:`, err.message);
            results.push({ name: pub.name, success: false, category: pub.category, note: err.message });
        }
    }

    const totalOk = results.filter(r => r.success).length;
    console.log(`\n${'='.repeat(75)}`);
    console.log(`🎉 HOÀN TẤT: Đã tự động đăng ký ${totalOk}/${results.length} nguồn thành công!`);
    console.log(`📬 Các bản tin sẽ bắt đầu gửi thẳng vào hòm thư của bạn đều đặn mà KHÔNG cần bấm link xác nhận!\n`);
    return results;
}

// Chạy trực tiếp nếu truyền tham số từ CLI
const argEmail = process.argv[2];
if (argEmail) {
    subscribeAll(argEmail);
}
