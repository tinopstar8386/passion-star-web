// api/auto-subscribe.js - Vercel Serverless Function
// 100% Single Opt-In Automated Newsletter Submitter

const SINGLE_OPT_IN_PUBLICATIONS = [
    {
        id: "worddaily",
        name: "Word Daily",
        domain: "https://worddaily.com",
        category: "Từ vựng tiếng Anh",
        note: "Mỗi sáng 1 từ vựng mới, định nghĩa & phát âm (Gửi thư thẳng)"
    },
    {
        id: "wordsmarts",
        name: "Word Smarts",
        domain: "https://wordsmarts.com",
        category: "Ngữ pháp & Tiếng Anh",
        note: "Mẹo ngữ pháp, thành ngữ & câu đố từ vựng mỗi ngày (Gửi thư thẳng)"
    },
    {
        id: "interestingfacts",
        name: "Interesting Facts",
        domain: "https://interestingfacts.com",
        category: "Kiến thức kỳ thú",
        note: "Sự thật kỳ thú về khoa học, lịch sử và đời sống mỗi sáng"
    },
    {
        id: "inspiringquotes",
        name: "Inspiring Quotes",
        domain: "https://inspiringquotes.com",
        category: "Danh ngôn & Động lực",
        note: "Danh ngôn truyền cảm hứng và tư duy tích cực mỗi ngày"
    },
    {
        id: "dailypassport",
        name: "Daily Passport",
        domain: "https://dailypassport.com",
        category: "Văn hóa & Khám phá",
        note: "Khám phá các kỳ quan, văn hóa và địa danh du lịch thế giới"
    },
    {
        id: "betterreport",
        name: "Better Report",
        domain: "https://betterreport.com",
        category: "Mẹo sống & Sức khỏe",
        note: "Mẹo vặt cuộc sống, mẹo công nghệ và tiêu dùng thông minh"
    }
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }
        const email = (body && body.email ? body.email : '').trim();

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ status: 'error', message: 'Email không đúng định dạng' });
        }

        const results = [];

        for (const pub of SINGLE_OPT_IN_PUBLICATIONS) {
            try {
                let nonce = "";
                try {
                    const homeRes = await fetch(pub.domain, {
                        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
                    });
                    const html = await homeRes.text();
                    const matchNonce = html.match(/"pardon_nonce":"([^"]+)"/);
                    if (matchNonce) nonce = matchNonce[1];
                } catch(e) {}

                const postBody = new URLSearchParams();
                postBody.append("action", "pardon_subscribe_handler");
                postBody.append("email", email);
                postBody.append("form_identifier", "home-subscribe");
                if (nonce) postBody.append("pardon_nonce", nonce);
                postBody.append("sub_source", "organic");

                const postRes = await fetch(`${pub.domain}/wp-admin/admin-ajax.php`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": `${pub.domain}/`
                    },
                    body: postBody
                });

                const text = await postRes.text();
                const ok = postRes.status === 200 && text.includes("200");
                results.push({
                    name: pub.name,
                    domain: pub.domain,
                    success: ok,
                    category: pub.category,
                    note: pub.note
                });
            } catch(err) {
                results.push({
                    name: pub.name,
                    domain: pub.domain,
                    success: false,
                    category: pub.category,
                    note: err.message
                });
            }
        }

        return res.status(200).json({
            status: 'success',
            email: email,
            totalSuccess: results.filter(r => r.success).length,
            totalSources: results.length,
            results: results
        });

    } catch (globalErr) {
        return res.status(500).json({ status: 'error', message: globalErr.message });
    }
}
