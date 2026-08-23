import React, { useState } from 'react';
import { Dropdown, Menu, Modal, InputNumber, message, Spin, Tag } from 'antd';
import { FiMoreVertical, FiEdit2, FiPauseCircle, FiPlayCircle, FiTrash2, FiLoader, FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { LuShieldCheck, LuFileSpreadsheet } from 'react-icons/lu';
import { useDispatch } from 'react-redux';
import productApis, { 
  useUpdateBolOfferStatusMutation, 
  useUpdateBolOfferStockMutation, 
  useDeleteBolOfferMutation,
  useGetBolProcessStatusQuery,
  useRevalidateProductsContentMutation,
  useLazyGetBolContentReportQuery,
} from '../../../Redux/productApis';

const OfferActionMenu = ({ offer }) => {
  const dispatch = useDispatch();
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [newStock, setNewStock] = useState(offer.stock?.amount || 0);

  // Content Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [triggerGetReport, { data: reportData, isFetching: isReportFetching }] = useLazyGetBolContentReportQuery();

  const { data: processStatus } = useGetBolProcessStatusQuery(offer.pending_process_id, {
    skip: !offer.pending_process_id || offer.pending_action !== 'DELETING',
    pollingInterval: 10000,
  });

  React.useEffect(() => {
    if (processStatus?.data?.status === 'SUCCESS' || processStatus?.data?.status === 'FAILURE') {
      dispatch(productApis.util.invalidateTags(['BolOffers']));
    }
  }, [processStatus, dispatch]);

  const isDeleting = offer.pending_action === 'DELETING' || processStatus?.data?.status === 'PENDING';

  const [updateStatus, { isLoading: isStatusLoading }] = useUpdateBolOfferStatusMutation();
  const [updateStock, { isLoading: isStockLoading }] = useUpdateBolOfferStockMutation();
  const [deleteOffer, { isLoading: isDeleteLoading }] = useDeleteBolOfferMutation();
  const [revalidateContent, { isLoading: isRevalidating }] = useRevalidateProductsContentMutation();

  const handleOpenReport = async () => {
    setIsReportModalOpen(true);
    if (offer.ean) {
      try {
        await triggerGetReport({ ean: offer.ean }).unwrap();
      } catch (err) {
        // error handling
      }
    }
  };

  const handleRevalidate = async () => {
    try {
      const res = await revalidateContent({
        eans: offer.ean ? [offer.ean] : [],
        draftIds: offer.draftId ? [offer.draftId] : [],
      }).unwrap();
      message.success(res.message || "Product content re-validated successfully!");
      if (isReportModalOpen && offer.ean) {
        triggerGetReport({ ean: offer.ean });
      }
    } catch (err) {
      message.error(err?.data?.detail || "Failed to re-validate product content.");
    }
  };

  const handleStatusToggle = async () => {
    try {
      await updateStatus({ 
        offerId: offer.offerId, 
        onHoldByRetailer: !offer.onHoldByRetailer 
      }).unwrap();
      message.success(`Offer ${offer.onHoldByRetailer ? 'resumed' : 'paused'} successfully`);
    } catch (err) {
      message.error(err?.data?.detail || "Failed to update offer status");
    }
  };

  const handleStockUpdate = async () => {
    try {
      await updateStock({ 
        offerId: offer.offerId, 
        amount: newStock 
      }).unwrap();
      message.success("Stock updated successfully");
      setIsStockModalOpen(false);
    } catch (err) {
      message.error(err?.data?.detail || "Failed to update stock");
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Offer',
      content: 'Are you sure you want to delete this offer from Bol.com? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteOffer(offer.offerId).unwrap();
          message.success("Offer deleted successfully");
        } catch (err) {
          message.error(err?.data?.detail || "Failed to delete offer");
        }
      }
    });
  };

  const menu = (
    <Menu onClick={(e) => e.domEvent.stopPropagation()}>
      <Menu.Item 
        key="report" 
        icon={<LuFileSpreadsheet className="text-blue-600" />} 
        onClick={(e) => { e.domEvent.stopPropagation(); handleOpenReport(); }}
      >
        View Bol Upload Report
      </Menu.Item>
      <Menu.Item 
        key="revalidate" 
        icon={<LuShieldCheck className="text-emerald-600" />} 
        onClick={(e) => { e.domEvent.stopPropagation(); handleRevalidate(); }}
        disabled={isRevalidating}
      >
        {isRevalidating ? "Re-validating..." : "Re-enrich & Fix Content"}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="stock" 
        icon={<FiEdit2 />} 
        onClick={(e) => { e.domEvent.stopPropagation(); setIsStockModalOpen(true); }}
      >
        Update Stock
      </Menu.Item>
      <Menu.Item 
        key="status" 
        icon={offer.onHoldByRetailer ? <FiPlayCircle /> : <FiPauseCircle />} 
        onClick={(e) => { e.domEvent.stopPropagation(); handleStatusToggle(); }}
      >
        {offer.onHoldByRetailer ? "Resume Listing" : "Pause Listing"}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="delete" 
        danger 
        icon={<FiTrash2 />} 
        onClick={(e) => { e.domEvent.stopPropagation(); handleDelete(); }}
      >
        Delete Offer
      </Menu.Item>
    </Menu>
  );

  if (isDeleting) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
        <FiLoader className="animate-spin" />
        Deleting...
      </div>
    );
  }

  return (
    <>
      <Dropdown overlay={menu} trigger={['click']}>
        <button 
          onClick={(e) => e.stopPropagation()} 
          className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-500 hover:text-brand hover:border-brand shadow-sm transition-colors"
          disabled={isStatusLoading || isDeleteLoading}
        >
          <FiMoreVertical size={14} />
        </button>
      </Dropdown>

      {/* Stock Modal */}
      <Modal
        title="Update Stock"
        open={isStockModalOpen}
        onOk={(e) => { e.stopPropagation(); handleStockUpdate(); }}
        onCancel={(e) => { e.stopPropagation(); setIsStockModalOpen(false); }}
        confirmLoading={isStockLoading}
        okText="Update"
      >
        <div className="py-4" onClick={(e) => e.stopPropagation()}>
          <label className="block text-sm font-medium text-gray-700 mb-2">New Stock Amount</label>
          <InputNumber 
            min={0} 
            value={newStock} 
            onChange={setNewStock} 
            className="w-full"
          />
        </div>
      </Modal>

      {/* Bol.com Upload & Validation Report Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base font-bold text-gray-800">
            <LuFileSpreadsheet className="text-blue-600" size={18} />
            Bol.com Content & Validation Report
          </div>
        }
        open={isReportModalOpen}
        onCancel={(e) => { e.stopPropagation(); setIsReportModalOpen(false); }}
        footer={[
          <button
            key="revalidate"
            onClick={handleRevalidate}
            disabled={isRevalidating}
            className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs border border-blue-200 mr-2 inline-flex items-center gap-1"
          >
            <LuShieldCheck size={14} />
            {isRevalidating ? "Fixing..." : "Re-enrich & Fix"}
          </button>,
          <button
            key="close"
            onClick={(e) => { e.stopPropagation(); setIsReportModalOpen(false); }}
            className="px-4 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs"
          >
            Close
          </button>
        ]}
        width={650}
      >
        <div className="py-3 text-xs space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-gray-400 font-mono">EAN: {offer.ean}</div>
              <div className="font-semibold text-gray-800 mt-0.5 line-clamp-1">{offer.store?.productTitle || offer.unknownProductTitle || "Product"}</div>
            </div>
            {reportData?.overall_status && (
              <Tag color={reportData.overall_status === 'SUCCESS' ? 'green' : reportData.overall_status === 'IN_PROGRESS' ? 'blue' : 'orange'}>
                {reportData.overall_status}
              </Tag>
            )}
          </div>

          {isReportFetching ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Spin />
              <span>Fetching live validation report from Bol.com...</span>
            </div>
          ) : reportData?.has_report === false ? (
            <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500">
              <FiInfo className="mx-auto mb-2 text-blue-500" size={24} />
              <p className="font-medium">{reportData?.message || "No recent content report found."}</p>
              <p className="text-[11px] text-gray-400 mt-1">Click "Re-enrich & Fix" to submit clean content to Bol.com.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                  <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                    <FiCheckCircle className="text-emerald-600" />
                    Product Assets (Photos)
                  </div>
                  <div className="text-lg font-bold text-emerald-900 mt-1">
                    {reportData?.stored_assets_count ?? 0} Stored / Accepted
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Bol.com is hosting your image assets.</div>
                </div>

                <div className={`p-3 rounded-xl border ${
                  (reportData?.declined_attributes_count || 0) > 0 
                    ? 'bg-rose-50/70 border-rose-100' 
                    : 'bg-blue-50/70 border-blue-100'
                }`}>
                  <div className="text-[11px] font-semibold flex items-center gap-1.5 text-gray-700">
                    {(reportData?.declined_attributes_count || 0) > 0 ? (
                      <FiAlertTriangle className="text-rose-500" />
                    ) : (
                      <FiCheckCircle className="text-blue-600" />
                    )}
                    Attribute Validation
                  </div>
                  <div className={`text-lg font-bold mt-1 ${
                    (reportData?.declined_attributes_count || 0) > 0 ? 'text-rose-700' : 'text-blue-900'
                  }`}>
                    {reportData?.declined_attributes_count || 0} Declined
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {(reportData?.declined_attributes_count || 0) > 0 
                      ? 'Some attributes did not match category schema.' 
                      : 'All submitted attributes passed validation!'}
                  </div>
                </div>
              </div>

              {/* Declined attributes list */}
              {reportData?.declined_attributes && reportData.declined_attributes.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5 text-xs">
                    <FiAlertTriangle className="text-amber-500" />
                    Declined Attributes Details ({reportData.declined_attributes.length}):
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2 thin-scrollbar pr-1">
                    {reportData.declined_attributes.map((attr, idx) => (
                      <div key={idx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-start justify-between gap-3">
                        <div>
                          <span className="font-bold text-gray-800 font-mono text-[11px]">{attr.id}</span>
                          <p className="text-[11px] text-gray-500 mt-0.5">{attr.subStatusDescription || attr.subStatus}</p>
                        </div>
                        <Tag color="volcano" className="text-[10px] font-mono shrink-0">
                          {attr.subStatus || "DECLINED"}
                        </Tag>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default OfferActionMenu;

