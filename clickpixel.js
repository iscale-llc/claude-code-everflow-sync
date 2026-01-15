< script type="text/javascript" >
    if (EF.urlParameter("affid2")) {

        const affid = EF.urlParameter("affid");

    const AFFID_DOMAIN_MAP = {
        40: "https://www.bz0nc1cn.com",
    69: "https://www.bz0nc1cn.com",
    77: "https://www.qw6azlkjs2.com",
        };
    const domain = AFFID_DOMAIN_MAP[affid] ?? "https://www.bz0nc1cn.com";
    // Partner Click
    EF.click({
        tracking_domain: domain,
    offer_id: EF.urlParameter("oid2"),
    affiliate_id: EF.urlParameter("affid2"),
    sub1: EF.urlParameter("sub1"),
    sub2: EF.urlParameter("sub2"),
    sub3: EF.urlParameter("sub3"),
    sub4: EF.urlParameter("sub4"),
    sub5: EF.urlParameter("sub5"),
    source_id: EF.urlParameter("source_id"),
    uid: EF.urlParameter("uid"),
    gclid: EF.urlParameter("gclid"),
    ttclid: EF.urlParameter("ttclid"),
        }).then((transaction_id) => {
        // Advertiser Click
        EF.click({
            tracking_domain: "https://www.mjkkj8trk.com",
            offer_id: EF.urlParameter("oid"),
            affiliate_id: EF.urlParameter("affid"),
            sub1: EF.urlParameter("affid2"), // Save pub/affiliate id from partner in sub1
            sub2: EF.urlParameter("sub2"),
            sub3: EF.urlParameter("sub3"),
            sub4: EF.urlParameter("sub4"),
            sub5: transaction_id, // Save partner click id (transaction_id) for postbacks
            uid: EF.urlParameter("uid2"),
            source_id: EF.urlParameter("source_id"),
        }).then(function (trimrx_id) {
            console.log('TrimRx Transaction ID=' + trimrx_id);
            // pass trimrx_id to the next click

            setTimeout(() => {

                var currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('_ef_transaction_id', trimrx_id);
                window.history.replaceState({}, '', currentUrl.toString());

                const params = getQueryParams();

                const quizLinks = document.querySelectorAll('a[href*="/quiz"]');

                quizLinks.forEach(link => {
                    const url = new URL(link.href, window.location.origin);
                    const searchParams = new URLSearchParams(url.search);
                    Object.entries(params).forEach(([key, value]) => {
                        searchParams.set(key, value);
                    });
                    url.search = searchParams.toString();
                    link.href = url.toString();
                });

                EF.conversion({
                    tracking_domain: "https://www.mjkkj8trk.com",
                    offer_id: 1,
                    event_id: 7, // Advertiser View Content Event ID
                    transaction_id: trimrx_id,
                });


            }, 1000);

        });
        });
    } else {
        // Advertiser Click
        EF.click({
            tracking_domain: "https://www.mjkkj8trk.com",
            offer_id: EF.urlParameter("oid"),
            affiliate_id: EF.urlParameter("affid"),
            sub1: EF.urlParameter("sub1"),
            sub2: EF.urlParameter("sub2"),
            sub3: EF.urlParameter("sub3"),
            sub4: EF.urlParameter("sub4"),
            sub5: EF.urlParameter("sub5"),
            uid: EF.urlParameter("uid2"),
            source_id: EF.urlParameter("source_id"),
            transaction_id: EF.urlParameter("_ef_transaction_id"),
        }).then(function (trimrx_id) {
            console.log('TrimRx Transaction ID=' + trimrx_id);
            // pass trimrx_id to the next click

            setTimeout(() => {

                var currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('_ef_transaction_id', trimrx_id);
                window.history.replaceState({}, '', currentUrl.toString());

                const params = getQueryParams();

                const quizLinks = document.querySelectorAll('a[href*="/quiz"]');

                quizLinks.forEach(link => {
                    const url = new URL(link.href, window.location.origin);
                    const searchParams = new URLSearchParams(url.search);
                    Object.entries(params).forEach(([key, value]) => {
                        searchParams.set(key, value);
                    });
                    url.search = searchParams.toString();
                    link.href = url.toString();
                });
                EF.conversion({
                    tracking_domain: "https://www.mjkkj8trk.com",
                    offer_id: 1,
                    event_id: 7, // Advertiser View Content Event ID
                    transaction_id: trimrx_id,
                });

            }, 1000);

        });
    } <script>