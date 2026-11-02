// api/auto-subscribe.js - Vercel Serverless Function
// 100% Single Opt-In Automated Newsletter Submitter

const SINGLE_OPT_IN_PUBLICATIONS = [
    {
        id: "worddaily",
        name: "Word Daily",
        domain: "https://worddaily.com",
        category: "Từ vựng tiếng Anh",
        type: "pardon",
        note: "Mỗi sáng 1 từ vựng mới, định nghĩa & phát âm (Gửi thư thẳng)"
    },
    {
        id: "wordsmarts",
        name: "Word Smarts",
        domain: "https://wordsmarts.com",
        category: "Ngữ pháp & Tiếng Anh",
        type: "pardon",
        note: "Mẹo ngữ pháp, thành ngữ & câu đố từ vựng mỗi ngày (Gửi thư thẳng)"
    },
    {
        id: "interestingfacts",
        name: "Interesting Facts",
        domain: "https://interestingfacts.com",
        category: "Kiến thức kỳ thú",
        type: "pardon",
        note: "Sự thật kỳ thú về khoa học, lịch sử và đời sống mỗi sáng"
    },
    {
        id: "inspiringquotes",
        name: "Inspiring Quotes",
        domain: "https://inspiringquotes.com",
        category: "Danh ngôn & Động lực",
        type: "pardon",
        note: "Danh ngôn truyền cảm hứng và tư duy tích cực mỗi ngày"
    },
    {
        id: "betterreport",
        name: "Better Report",
        domain: "https://betterreport.com",
        category: "Mẹo sống & Sức khỏe",
        type: "pardon",
        note: "Mẹo vặt cuộc sống, mẹo công nghệ và tiêu dùng thông minh"
    },
    {
        id: "historyfacts",
        name: "History Facts",
        domain: "https://historyfacts.com",
        category: "Lịch sử thế giới",
        type: "pardon",
        note: "Những câu chuyện và sự thật lịch sử kỳ thú của các nền văn minh"
    },
    {
        id: "crosswordclub",
        name: "Crossword Club",
        domain: "https://crosswordclub.com",
        category: "Đố vui & Trí tuệ",
        type: "pardon",
        note: "Câu đố chữ, rèn luyện tư duy não bộ và trò chơi ô chữ mỗi sáng"
    },
    {
        id: "houseoutlook",
        name: "House Outlook",
        domain: "https://houseoutlook.com",
        category: "Nhà cửa & Không gian",
        type: "pardon_refresh",
        note: "Ý tưởng thiết kế nội thất, kiến trúc nhà đẹp và không gian sống"
    },
    {
        id: "nicenews",
        name: "Nice News",
        domain: "https://nicenews.com",
        category: "Tin tức tích cực",
        type: "nicenews",
        note: "Tin tức lạc quan, câu chuyện ấm lòng và sự tử tế khắp thế giới"
    },
    {
        id: "goodheadlines",
        name: "Good Headlines",
        domain: "https://goodheadlines.com",
        category: "Điểm tin vui tươi",
        type: "webflow",
        siteId: "667b03af4c96fb4374afa400",
        formName: "Email Form",
        emailField: "Email",
        note: "Tiêu đề tin tức vui tươi, truyền cảm hứng đầu ngày mới"
    },
    {
        id: "moviebrief",
        name: "Movie Brief",
        domain: "https://moviebrief.com",
        category: "Điện ảnh & Phim ảnh",
        type: "webflow",
        siteId: "665df7b51f919f2ee06528d8",
        formName: "Email Form 1",
        emailField: "Email 1",
        note: "Gợi ý phim hay, tóm tắt đánh giá và các tựa phim chiếu rạp đáng xem"
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
                        success: ok,
                        category: pub.category,
                        note: ok ? pub.note : `HTTP ${postRes.status}`
                    });
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
                        success: ok,
                        category: pub.category,
                        note: ok ? pub.note : `HTTP ${postRes.status}`
                    });
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

                    const postBody = new URLSearchParams();
                    postBody.append("action", "nicenews_subscribe");
                    postBody.append("email", email);
                    postBody.append("sub_source", "web+organic");
                    if (nonce) postBody.append("nonce", nonce);

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
                    const ok = postRes.status === 200 && text.includes("true");
                    results.push({
                        name: pub.name,
                        success: ok,
                        category: pub.category,
                        note: ok ? pub.note : `HTTP ${postRes.status}`
                    });
                } else if (pub.type === 'webflow') {
                    const postBody = new URLSearchParams();
                    postBody.append("name", pub.formName);
                    postBody.append(`fields[${pub.emailField}]`, email);
                    postBody.append("fields[source]", "organic");

                    const postRes = await fetch(`https://webflow.com/api/v1/form/${pub.siteId}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            "Referer": `${pub.domain}/`
                        },
                        body: postBody
                    });

                    const text = await postRes.text();
                    const ok = postRes.status === 200 && text.includes("ok");
                    results.push({
                        name: pub.name,
                        success: ok,
                        category: pub.category,
                        note: ok ? pub.note : `HTTP ${postRes.status}`
                    });
                }
            } catch(pubErr) {
                results.push({
                    name: pub.name,
                    success: false,
                    category: pub.category,
                    note: pubErr.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;

        return res.status(200).json({
            status: 'success',
            total: results.length,
            successCount: successCount,
            email: email,
            results: results
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
}
