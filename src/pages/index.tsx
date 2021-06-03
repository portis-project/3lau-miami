import './style.css';
import Head from 'next/head';
import {FC, useEffect, useState, useRef} from 'react';
import {useRouter} from 'next/router';
import Portis from '@portis/web3';
import cx from 'classnames'

const ERROR_MESSAGES: {
    [index: string]: {
        mainMessage: string,
        secondaryMessage?: string
    }
} = {
    VOUCHER_ID_REQUIRED: {
        mainMessage: 'Scan a QR code to claim!',
        secondaryMessage: 'Be one of the first 99 people to scan one of the QR codes around you to claim your NFT!',
    },
    VOUCHER_ID_DOES_NOT_EXIST: {
        mainMessage: 'This ID does not exist in our system.',
        secondaryMessage: 'Scan one of the QR codes around you to claim your NFT!',
    },
    VOUCHER_ALREADY_CLAIMED: {
        mainMessage: 'You have already claimed this NFT.',
        secondaryMessage: 'We will be distributing the NFT to your Portis Wallet in a couple of days.',
    },
    CAMPAIGN_MAX_EXCEEDED: {
        mainMessage: 'Unfortunately, all available NFTs have already been claimed.',
        secondaryMessage: 'Stay tuned for other opportunities to claim rare NFTs in the future!',
    },
    SINGLE_USE_VOUCHER_ALREADY_CLAIMED: {
        mainMessage: 'Unfortunately, this NFT has already been claimed.',
        secondaryMessage: 'Try scanning another QR code or stay tuned for other opportunities to claim rare NFTs in the future!',
    },
    DEFAULT: {
        mainMessage: 'Something went wrong, please try again.',
    },
};

enum PROMO_VIEWS {
    LOADING_CAMPAIGN = 'LOADING_CAMPAIGN',
    PRE_EVENT = 'PRE',
    ONGOING = 'ONGOING',
    POST_EVENT = 'POST',
    SUCCESS = 'SUCCESS',
}

const getPromoViewByDateTime = (currentTime: number, startTime: number, endTime: number, promoView?: PROMO_VIEWS) => {
    const isBeforeEventStart = currentTime < startTime;
    const isAfterEventEnd = currentTime > endTime;
    if (promoView === PROMO_VIEWS.SUCCESS) {
        return PROMO_VIEWS.SUCCESS;
    }
    if (isBeforeEventStart) {
        return PROMO_VIEWS.PRE_EVENT;
    } else if (isAfterEventEnd) {
        return PROMO_VIEWS.POST_EVENT;
    } else {
        return PROMO_VIEWS.ONGOING;
    }
}

const portis = new Portis('05d421c3-24cc-4ba3-a606-a1a0215f4253', 'mainnet');

const onResize = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
const useOnResize = () => {
    onResize()
    window.addEventListener('resize', onResize);
    return () => {
        window.removeEventListener('resize', onResize);
    };
}

const onCreateWalletClick = () => {
    window.open('https://wallet.portis.io/register', '_blank')
}

interface INoticeViewProps {
    isSuccess?: boolean,
    mainMessage: string,
    secondaryMessage?: string,
}

const NoticeView: FC<INoticeViewProps> = ({isSuccess, mainMessage, secondaryMessage}) => {
    const mainMessageClass = cx(['promo-text', 'font-black', isSuccess ? 'success-text' : 'error-text'])
    const secondaryMessageElement = secondaryMessage
        ? <p className="promo-text">{secondaryMessage}</p>
        : null;

    return <>
        <p className={mainMessageClass}>{mainMessage}</p>
        {secondaryMessageElement}
    </>;
}

const SuccessView = () => <NoticeView
    mainMessage="Congratulations, you have successfully claimed an NFT from this event!"
    secondaryMessage="We will be distributing the NFT to your Portis Wallet in a couple of days."
    isSuccess
/>

const BlauPage = () => {
    const [claimError, setClaimError] = useState<string>("");
    const [campaignStartTime, setCampaignStartTime] = useState<number | null>(null);
    const [campaignEndTime, setCampaignEndTime] = useState<number | null>(null);
    const [promoView, setPromoView] = useState<PROMO_VIEWS>(PROMO_VIEWS.LOADING_CAMPAIGN);
    const [isClaimPending, setIsClaimPending] = useState<boolean>(false);
    const {query: {campaignId, voucherId}} = useRouter();

    useEffect(() => {
        if (campaignId) {
            portis.getCampaignInfo(Array.isArray(campaignId) ? campaignId[0] : campaignId).then(({result}) => {
                setCampaignStartTime(+new Date((result as any).campaignDateStart));
                setCampaignEndTime(+new Date((result as any).campaignDateEnd));
            });
        }
    }, [campaignId]);

    const claimVoucher = async () => {
        setIsClaimPending(true);
        const {error} = await portis.claimVoucher(Array.isArray(voucherId) ? voucherId[0] : voucherId);
        if (error) {
            setClaimError(typeof error === 'string' ? error : (error as any).code);
        } else {
            setPromoView(PROMO_VIEWS.SUCCESS);
        }
    };

    useEffect(useOnResize, []);

    useInterval(() => {
        if (campaignStartTime && campaignEndTime) {
            const currentTime = +(new Date());
            const nextPromoView = getPromoViewByDateTime(currentTime, campaignStartTime, campaignEndTime, promoView);
            if (promoView !== nextPromoView) {
                setPromoView(nextPromoView);
            }
        }
    }, 1000);

    const PromoView = () => {
        if (claimError) {
            return <NoticeView {...ERROR_MESSAGES[claimError]} />
        }
        if (promoView === PROMO_VIEWS.SUCCESS) {
            return <SuccessView/>
        }
        if (promoView === PROMO_VIEWS.ONGOING) {
            const claimButton = isClaimPending
                ? <div className="blau-spinner"/>
                : (
                    <button onClick={claimVoucher} className="blau-button">
                        Claim Now
                    </button>
                )
            return (
                <>
                    <p className="promo-text">
                        NFTs will be awarded to the first 99 users to create or log into a Portis wallet.
                    </p>
                    {claimButton}
                </>
            );
        }

        if (promoView === PROMO_VIEWS.POST_EVENT) {
            return (
                <>
                    <p className="promo-text font-black">This event has ended.</p>
                    <p className="promo-text">You can still create a Portis wallet to buy, sell, and hold NFTs.</p>
                    <button onClick={onCreateWalletClick} className="blau-button">
                        Create Wallet
                    </button>
                </>
            );
        }

        if (promoView === PROMO_VIEWS.PRE_EVENT) {
            return (
                <div>
                    <p className="promo-date">06.04.21</p>
                    <p className="promo-text pre">For updates, follow:</p>
                    <a href="https://twitter.com/3LAU" target="_blank" rel="noopener" className="promo-link">
                        twitter.com/3LAU
                    </a>
                    <a href="https://twitter.com/portis_io" target="_blank" rel="noopener" className="promo-link">
                        twitter.com/portis_io
                    </a>
                </div>
            );
        }
        ;

        return <div className="blau-spinner"/>
    }


    return (
        <>
            <Head>
                <link rel="icon" href="/static/favicon.ico"/>
                <title>Portis × 3LAU</title>
                <link rel="preconnect" href="https://fonts.gstatic.com"/>
                <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;500&display=swap"
                      rel="stylesheet"/>
            </Head>
            <div className="blau-wrap">
                <div className="blau-logo-wrap">
                    <img className="blau-logo" src="/static/3lau-logo.png" alt="3LAU Logo"/>
                </div>
                <div className="content-strip">
                    <div className="strip-inner">
                        <PromoView/>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BlauPage;

const useInterval = (callback: any, delay: number) => {
    const savedCallback = useRef(() => {
    });

    // Remember the latest callback.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            savedCallback.current();
        }

        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}
