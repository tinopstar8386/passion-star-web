// auto_subscribe.mjs - 100% Single Opt-In Automated Newsletter Submitter
// Tự động đăng ký các nguồn giống Word Daily: Chỉ cần Email, Nhận thư thẳng, KHÔNG cần bấm link Confirm

export const SINGLE_OPT_IN_PUBLICATIONS = [
    {
        id: "worddaily",
        name: "Word Daily",
        domain: "https://worddaily.com",
        category: "Từ vựng tiếng Anh",
        frequency: "Mỗi sáng",
        desc: "Mỗi ngày 1 từ vựng tiếng Anh mới, giải nghĩa chi tiết, phát âm và câu ví dụ."
    },
    {
        id: "wordsmarts",
        name: "Word Smarts",
        domain: "https://wordsmarts.com",
        category: "Ngữ pháp & Tiếng Anh",
        frequency: "Mỗi ngày",
        desc: "Mẹo ngữ pháp, thành ngữ tiếng Anh, câu đố từ vựng thực tế."
    },
    {
        id: "interestingfacts",
        name: "Interesting Facts",
        domain: "https://interestingfacts.com",
        category: "Kiến thức kỳ thú",
        frequency: "Mỗi ngày",
        desc: "Những sự thật kỳ thú về khoa học, lịch sử và thế giới mỗi sáng."
    },
    {
        id: "inspiringquotes",
        name: "Inspiring Quotes",
        domain: "https://inspiringquotes.com",
        category: "Danh ngôn & Động lực",
        frequency: "Mỗi ngày",
        desc: "Danh ngôn truyền cảm hứng và tư duy tích cực mỗi ngày từ các danh nhân."
    },
    {
        id: "dailypassport",
        name: "Daily Passport",
        domain: "https://dailypassport.com",
        category: "Văn hóa & Khám phá",
        frequency: "Mỗi ngày",
        desc: "Khám phá các địa danh, kỳ quan thế giới và cẩm nang văn hóa."
    },
    {
        id: "betterreport",
        name: "Better Report",
        domain: "https://betterreport.com",
        category: "Mẹo sống & Sức khỏe",
        frequency: "Mỗi ngày",
        desc: "Bản tin mẹo vặt cuộc sống, mẹo công nghệ, sức khỏe và tiêu dùng thông minh."
    }
];

export async function subscribeAll(email) {
    const results = [];
    console.log(`\n🚀 BẮT ĐẦU TỰ ĐỘNG ĐĂNG KÝ 6 NGUỒN SINGLE OPT-IN CHO: ${email}`);
    console.log(`💡 Đặc điểm: Chỉ cần Email • Không cần điền tên • Nhận thư thẳng KHÔNG CẦN BẤM LINK CONFIRM\n${'='.repeat(70)}`);

    for (let i = 0; i < SINGLE_OPT_IN_PUBLICATIONS.length; i++) {
        const pub = SINGLE_OPT_IN_PUBLICATIONS[i];
        console.log(`⏳ [${i + 1}/${SINGLE_OPT_IN_PUBLICATIONS.length}] Đang đăng ký ${pub.name} (${pub.domain})...`);

        try {
            // Lấy nonce động từ trang chủ
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
                console.log(`⚠️ [${pub.name}]: Phản hồi HTTP ${postRes.status} (${text.substring(0, 60)})`);
                results.push({ name: pub.name, success: false, category: pub.category, note: `HTTP ${postRes.status}` });
            }
        } catch(err) {
            console.error(`❌ [${pub.name}] Lỗi kết nối:`, err.message);
            results.push({ name: pub.name, success: false, category: pub.category, note: err.message });
        }
    }

    const totalOk = results.filter(r => r.success).length;
    console.log(`\n🎉 HOÀN TẤT: Đã tự động đăng ký ${totalOk}/${results.length} nguồn thành công!`);
    console.log(`📬 Các bản tin từ vựng và tri thức sẽ bắt đầu gửi thẳng vào hòm thư của bạn đều đặn mỗi ngày mà KHÔNG cần bấm link xác nhận!\n`);
    return results;
}

// Chạy trực tiếp nếu truyền tham số từ CLI
const argEmail = process.argv[2];
if (argEmail) {
    subscribeAll(argEmail);
}
