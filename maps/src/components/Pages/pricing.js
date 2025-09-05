import React from 'react';
// Assuming you want to use external CSS for styling

const PricingTable = () => {
  return (
    <div id="mainContainer">
      <div className="margin-body">

        {/* Title Section */}
        <div  className="row">
          <div className="col-12">
            <div className="wpb_text_column wpb_content_element">
              <div className="wpb_wrapper">
                <div className="title-h1 text-center">
                  <span><span className="light">Pricing </span>Table</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* <div style={{marginBottom:"20px"}} className="row">
          <div className="col-12">
            <div className="wpb_text_column wpb_content_element">
              <div className="wpb_wrapper">
                <div className="text-white text-center">
                    <h5>
                  <span><span className="light">1 CREDIT = 1 INR </span></span></h5>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{marginBottom:"50px"}} className="row">
          <div className="col-12">
            <div className="wpb_text_column wpb_content_element">
              <div className="wpb_wrapper">
                <div>
                  <span><span style={{color:"white"}} className="light">*Each credit is equivalent to 1 INR. Credit consumption varies based on the feature utilized. </span></span>
                </div>
              </div>
            </div>
          </div>
        </div> */}
        {/* Pricing Rows */}
        <div style={{display:"flex"}} className="row">
          {/* Pricing Key */}
          <div className="col-sm-3 col-md-2 pricing-key">
            <div style={{color:"white"}} className="pricing-column">
            <div className="pricing-row-title">
                <div className="pricing_row_title">Features</div>
              </div>
              <figure >User and Administrative Management</figure>
              
              <figure>Data Visualisation</figure>
              <figure>Additional Data Visualisation</figure>
              <figure>Analytic Tools</figure>
              <figure>Chatbot</figure>
              <figure>Drishti Survey</figure>
              <figure>3D Map</figure>
              <figure>Cloud</figure>
            </div>
          </div>
        
          {/* Free Plan */}
          <div style={{flex:1}} className="col-sm-5 col-md-5 pricing-column-wrapper">
            <div className="pricing-column">
              <div className="pricing-row-title">
                <div className="pricing_row_title">Free</div>
              </div>
              <figure className="pricing-row">Single User</figure>
              <figure className="pricing-row">All Data Available (Limits Applied)</figure>
              <figure className="pricing-row">Few Non-AI Features Available</figure>
              <figure className="pricing-row">Basic Tools Available</figure>
              <figure className="pricing-row">Basic Chatbot</figure>
              <figure className="pricing-row">Not Available</figure>
              <figure className="pricing-row">Available ( Limits Applied )</figure>
              <figure className="pricing-row">1 GB</figure>
              <div className="pricing-footer">
                <div className="gem-button-container gem-button-position-center">
                  <a href="/panvel" className="gem-button gem-green">Get Started</a>
                </div>
              </div>
            </div>
          </div>

          {/* Small Plan */}
          <div style={{flex:1}} className="col-sm-5 col-md-5 pricing-column-wrapper">
            <div className="pricing-column">
              <div className="pricing-row-title">
                <div className="pricing_row_title">Basic</div>
              </div>
              <figure className="pricing-row">Upto 10 Users</figure>
              <figure className="pricing-row">All Data Available</figure>
              <figure className="pricing-row">Some Non-AI Features Available</figure>
              <figure className="pricing-row">All Tools Available</figure>
              <figure className="pricing-row">Basic Chatbot</figure>
              <figure className="pricing-row">Upto 2 Surveys</figure>
              <figure className="pricing-row">Available</figure>
              <figure className="pricing-row">15 GB</figure>
              <div className="pricing-footer">
                <div className="gem-button-container gem-button-position-center">
                  <a href="#" className="gem-button gem-purple">1000 INR / usr/ month</a>
                </div>
              </div>
            </div>
          </div>

          {/* Medium Plan */}
          <div style={{flex:1}} className="col-sm-5 col-md-5 pricing-column-wrapper">
            <div className="pricing-column">
              <div className="pricing-row-title">
                <div className="pricing_row_title">Advanced</div>
              </div>
              <figure className="pricing-row">Upto 100 Users</figure>
              <figure className="pricing-row">All Data Available</figure>
              <figure className="pricing-row">All Non-AI Features Available <p style={{margin:"0px",padding:"0px",color:"transparent"}}>Available</p></figure>
              <figure className="pricing-row">All Tools Available</figure>
              <figure className="pricing-row">Smart Chatbot</figure>
              <figure className="pricing-row">Upto 20 Surveys</figure>
              <figure className="pricing-row">Available</figure>
              <figure className="pricing-row">50 GB</figure>
              <div className="pricing-footer">
                <div className="gem-button-container gem-button-position-center">
                  <a href="#" className="gem-button gem-orange">1500 INR / usr/ month</a>
                </div>
              </div>
            </div>
          </div>

          {/* Large Plan */}
          <div style={{flex:1}} className="col-sm-5 col-md-5 pricing-column-wrapper">
            <div className="pricing-column">
              <div className="pricing-row-title">
                <div className="pricing_row_title">Enterprise</div>
              </div>
              <figure className="pricing-row">Customised</figure>
              <figure className="pricing-row">All Data Available</figure>
              <figure className="pricing-row">All Features Available Including AI Features</figure>
              <figure className="pricing-row">All Tools Available</figure>
              <figure className="pricing-row">Smart Chatbot</figure>
              <figure className="pricing-row">Customised</figure>
              <figure className="pricing-row">Available</figure>
              <figure className="pricing-row">Customised</figure>
              <div className="pricing-footer">
                <div className="gem-button-container gem-button-position-center">
                  <a href="#" className="gem-button gem-yellow">2000 INR / usr/ month</a>
                </div>
              </div>
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
};

export default PricingTable;
